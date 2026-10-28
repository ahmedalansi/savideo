"""yt-dlp in-process: read a video's info and turn it into what the web app shows.

`build_media` is a pure function over yt-dlp's info dict, so it is tested
without the network. The public half goes to the browser; the private half
(stream URLs, headers) stays in Redis and is used only to stream the file.
"""

import os
import re
import shutil
import tempfile
from typing import Any, Protocol

import anyio

from .errors import ApiError
from .platforms import Platform

AUDIO_BITRATES = (192, 128)
STREAMABLE = {"http", "https", "m3u8", "m3u8_native"}
_CODEC_RANK = {"avc1": 0, "h264": 0, "av01": 1, "vp09": 2, "vp9": 2}


class Extractor(Protocol):
    async def extract(self, url: str, proxy: str | None) -> dict[str, Any]: ...
    async def extract_playlist(self, url: str, proxy: str | None, limit: int) -> dict[str, Any]: ...


class YtDlpExtractor:
    def __init__(self, cookies_file: str | None = None):
        # Netscape cookies.txt of a throwaway account; Instagram often wants a login.
        self.cookies_file = cookies_file or None

    def _opts(self, proxy: str | None) -> dict[str, Any]:
        opts: dict[str, Any] = {
            "quiet": True,
            "no_warnings": True,
            "skip_download": True,
            "noplaylist": True,
            "socket_timeout": 15,
            "retries": 2,
            "cachedir": False,
            # Never fall back to the generic extractor: it would fetch any URL.
            "allowed_extractors": ["default", "-generic"],
        }
        if proxy:
            opts["proxy"] = proxy
        return opts

    def _run(self, url: str, opts: dict[str, Any]) -> dict[str, Any]:
        import yt_dlp

        jar = None
        if self.cookies_file:
            # yt-dlp writes the jar back on close; give each call its own copy so
            # parallel workers never clash and the original can stay read-only.
            fd, jar = tempfile.mkstemp(suffix=".txt")
            os.close(fd)
            shutil.copyfile(self.cookies_file, jar)
            opts = opts | {"cookiefile": jar}
        try:
            with yt_dlp.YoutubeDL(opts) as ydl:
                info = ydl.extract_info(url, download=False)
                return ydl.sanitize_info(info)
        except yt_dlp.utils.GeoRestrictedError as e:
            raise ApiError("geo_blocked", str(e)) from e
        except yt_dlp.utils.UnsupportedError as e:
            raise ApiError("unsupported_site", str(e)) from e
        except yt_dlp.utils.DownloadError as e:
            raise ApiError(classify_error(str(e)), str(e)[:300]) from e
        finally:
            if jar:
                os.unlink(jar)

    async def extract(self, url: str, proxy: str | None) -> dict[str, Any]:
        return await anyio.to_thread.run_sync(self._run, url, self._opts(proxy))

    async def extract_playlist(self, url: str, proxy: str | None, limit: int) -> dict[str, Any]:
        opts = self._opts(proxy) | {"noplaylist": False, "extract_flat": "in_playlist", "playlistend": limit}
        return await anyio.to_thread.run_sync(self._run, url, opts)


_ERROR_RULES: list[tuple[str, str]] = [
    (r"private video|this video is private|is private|login required to view", "private_video"),
    (r"sign in to confirm your age|age[- ]restricted|inappropriate for some users", "age_restricted"),
    (r"available in your country|geo.?restrict|not available from your location|blocked it in your country", "geo_blocked"),
    (r"sign in to confirm you.?re not a bot|http error 429|too many requests|rate.?limit", "platform_down"),
    (r"live event will begin|premieres in|is_live|this live event|is live", "live_stream"),
    (r"video unavailable|has been removed|no longer available|does not exist|not found|404|deleted|terminated", "removed_video"),
    (r"unsupported url", "unsupported_site"),
    (r"no video formats found|no video could be found|there'?s no video", "removed_video"),
]


def classify_error(message: str) -> str:
    text = message.lower()
    for pattern, code in _ERROR_RULES:
        if re.search(pattern, text):
            return code
    return "platform_down"


def is_bot_block(err: ApiError) -> bool:
    return err.code == "platform_down" and bool(re.search(r"bot|429|too many|403|rate.?limit|login required", err.message.lower()))


# ---- info dict -> MediaInfo -------------------------------------------------


def _has(codec: Any) -> bool | None:
    if codec is None:
        return None
    return codec != "none"


def _kinds(f: dict) -> tuple[bool, bool]:
    v, a = _has(f.get("vcodec")), _has(f.get("acodec"))
    if v is None and a is None:
        # Unknown codecs: yt-dlp treats such a format as having both.
        has_v = bool(f.get("height")) or f.get("ext") in ("mp4", "webm", "flv", "mov")
        return has_v, True
    if v is None:
        v = bool(f.get("height"))
    if a is None:
        a = not v
    return v, a


def _quality(f: dict) -> int | None:
    w, h = f.get("width"), f.get("height")
    if not h:
        return None
    # Portrait video (Shorts, Reels): the label follows the short side, 1080x1920 is "1080p".
    return min(w, h) if w else h


def _size(f: dict, duration: float) -> int | None:
    size = f.get("filesize") or f.get("filesize_approx")
    if size:
        return int(size)
    if f.get("tbr") and duration:
        return int(f["tbr"] * 125 * duration)
    return None


def _source(f: dict) -> dict:
    """What we need later to fetch this format: URL, headers, protocol, chunking."""
    chunk = (f.get("downloader_options") or {}).get("http_chunk_size")
    return {
        "url": f["url"],
        "headers": f.get("http_headers") or {},
        "protocol": f.get("protocol") or "https",
        "chunk": int(chunk) if chunk else None,
    }


def _video_rank(f: dict) -> tuple:
    codec = (f.get("vcodec") or "").split(".")[0].lower()
    return (_CODEC_RANK.get(codec, 3), 0 if f.get("ext") == "mp4" else 1, -(f.get("tbr") or 0))


def _audio_rank(f: dict) -> tuple:
    codec = (f.get("acodec") or "").split(".")[0].lower()
    mp4_friendly = codec in ("mp4a", "aac") or f.get("ext") == "m4a"
    return (0 if mp4_friendly else 1, -(f.get("abr") or f.get("tbr") or 0))


def build_media(info: dict, platform: Platform, max_duration_s: int, max_audio_duration_s: int) -> tuple[dict, dict]:
    """Returns (public MediaInfo without media_id, private stream table keyed by our format_id)."""
    if info.get("_type") == "playlist":
        raise ApiError("invalid_url", "playlist link")
    if info.get("is_live") or info.get("live_status") in ("is_live", "is_upcoming", "post_live"):
        raise ApiError("live_stream")
    duration = float(info.get("duration") or 0)
    if duration > max(max_duration_s, max_audio_duration_s):
        raise ApiError("too_long")

    formats = [
        f
        for f in info.get("formats") or [info]
        if f.get("url") and (f.get("protocol") or "https") in STREAMABLE and f.get("ext") != "mhtml"
    ]
    progressive, video_only, audio_only = [], [], []
    for f in formats:
        has_v, has_a = _kinds(f)
        if has_v and has_a:
            progressive.append(f)
        elif has_v:
            video_only.append(f)
        elif has_a:
            audio_only.append(f)

    best_audio = min(audio_only, key=_audio_rank) if audio_only else None
    public: list[dict] = []
    private: dict[str, dict] = {}

    if duration <= max_duration_s:
        heights = sorted({q for f in progressive + video_only if (q := _quality(f)) and q <= platform.max_height}, reverse=True)
        for q in heights:
            prog = [f for f in progressive if _quality(f) == q]
            vids = [f for f in video_only if _quality(f) == q]
            if prog:
                f = min(prog, key=lambda f: (0 if f.get("ext") == "mp4" else 1, -(f.get("tbr") or 0)))
                video, audio, size = f, None, _size(f, duration)
                direct = f.get("ext") == "mp4" and (f.get("protocol") or "https") in ("http", "https")
            else:
                video, audio = min(vids, key=_video_rank), best_audio
                size = _size(video, duration)
                if size is not None and audio is not None:
                    size = size + (_size(audio, duration) or 0)
                direct = False
            fid = f"v{q}"
            needs_merge = audio is not None
            public.append({"format_id": fid, "kind": "video", "height": q, "ext": "mp4", "size_estimate": size, "needs_merge": needs_merge})
            private[fid] = {
                "kind": "video",
                "height": q,
                "mode": "direct" if direct else "ffmpeg",
                "video": _source(video),
                "audio": _source(audio) if audio else None,
            }
        # Audio-less platforms: a video-only format stays a plain video; nothing to merge.

    audio_src = best_audio or (min(progressive, key=lambda f: f.get("tbr") or 0) if progressive else None)
    audio_ok = platform.audio_supported and audio_src is not None and duration <= max_audio_duration_s
    if audio_ok:
        for kbps in AUDIO_BITRATES:
            fid = f"a{kbps}"
            public.append(
                {"format_id": fid, "kind": "audio", "height": None, "ext": "mp3", "size_estimate": int(kbps * 125 * duration) if duration else None, "needs_merge": False, "abr_kbps": kbps}
            )
            private[fid] = {"kind": "audio", "abr_kbps": kbps, "mode": "ffmpeg", "video": None, "audio": _source(audio_src)}

    if not public:
        raise ApiError("too_long" if duration > max_duration_s else "removed_video", "no downloadable formats")

    keys = {str(k) for k in (info.get("id"), info.get("display_id")) if k}
    keys |= {k[1:] for k in keys if re.fullmatch(r"v\d+", k)}  # twitch VOD ids
    channel = info.get("channel_id") or info.get("uploader_id")
    media = {
        "title": (info.get("title") or "video").strip()[:300],
        "duration_s": round(duration),
        "thumbnail": info.get("thumbnail"),
        "formats": public,
        "audio_supported": audio_ok,
        "media_keys": sorted(keys),
        "channel_key": str(channel) if channel else None,
    }
    return media, private


def build_playlist(info: dict, limit: int) -> dict:
    items = []
    for e in (info.get("entries") or [])[:limit]:
        if not e:
            continue
        url = e.get("url") or e.get("webpage_url") or ""
        if not url.startswith("http"):
            if not e.get("id"):
                continue
            url = f"https://www.youtube.com/watch?v={e['id']}"
        thumbs = e.get("thumbnails") or []
        items.append(
            {
                "url": url,
                "title": e.get("title") or "video",
                "duration_s": round(e.get("duration") or 0),
                "thumbnail_url": e.get("thumbnail") or (thumbs[-1]["url"] if thumbs else None),
            }
        )
    return {"title": info.get("title") or "Playlist", "items": items}
