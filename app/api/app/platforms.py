"""The seven platforms: which hosts belong to each, and how to read a video id from a link.

Only links whose host matches an enabled platform ever reach yt-dlp, so the
server cannot be pointed at internal addresses (and yt-dlp's generic extractor
is switched off as well).
"""

import re
from dataclasses import dataclass
from urllib.parse import parse_qs, urlsplit, urlunsplit


@dataclass(frozen=True)
class Platform:
    id: str
    display_name: str
    enabled: bool = True
    audio_supported: bool = True
    max_height: int = 2160
    use_proxy: bool = False


# Same rows as the seed in replica/schema.sql. Used when there is no database,
# and as the host list (hosts are code, not data).
DEFAULTS: dict[str, Platform] = {
    p.id: p
    for p in [
        Platform("youtube", "YouTube", use_proxy=True),
        Platform("facebook", "Facebook"),
        Platform("x", "X", audio_supported=False),
        Platform("reddit", "Reddit"),
        Platform("twitch", "Twitch"),
        Platform("bilibili", "Bilibili"),
        Platform("dailymotion", "Dailymotion"),
    ]
}

HOSTS: dict[str, tuple[str, ...]] = {
    "youtube": ("youtube.com", "youtu.be", "youtube-nocookie.com"),
    "facebook": ("facebook.com", "fb.watch", "fb.com"),
    "x": ("x.com", "twitter.com"),
    "reddit": ("reddit.com", "redd.it"),
    "dailymotion": ("dailymotion.com", "dai.ly"),
    "bilibili": ("bilibili.com", "b23.tv"),
    "twitch": ("twitch.tv",),
}

# Query parameters that only track the visitor; dropped so the cache key is stable.
_TRACKING = re.compile(r"^(utm_.*|si|feature|fbclid|igshid|ref|ref_src|share_id|s|t|pp)$")


def parse_url(raw: str) -> str | None:
    s = (raw or "").strip()
    if not s or len(s) > 2048 or re.search(r"\s", s):
        return None
    if not re.match(r"^https?://", s, re.I):
        s = "https://" + s
    try:
        parts = urlsplit(s)
    except ValueError:
        return None
    host = (parts.hostname or "").lower()
    if "." not in host or parts.username or parts.password or parts.port not in (None, 80, 443):
        return None
    return s


def detect_platform(url: str) -> str | None:
    host = (urlsplit(url).hostname or "").lower()
    host = re.sub(r"^(www|m|mobile)\.", "", host)
    for pid, hosts in HOSTS.items():
        if any(host == h or host.endswith("." + h) for h in hosts):
            return pid
    return None


def normalize(url: str) -> str:
    """https, lower-case host, no fragment, no tracking parameters."""
    p = urlsplit(url)
    host = re.sub(r"^(www|m|mobile)\.", "", (p.hostname or "").lower())
    keep = [f"{k}={v[0]}" for k, v in sorted(parse_qs(p.query).items()) if not _TRACKING.match(k)]
    return urlunsplit(("https", host, p.path.rstrip("/") or "/", "&".join(keep), ""))


def is_playlist(url: str) -> bool:
    """A YouTube playlist link without a video id. A watch link with &list= is one video."""
    p = urlsplit(url)
    return detect_platform(url) == "youtube" and p.path == "/playlist" and "list" in parse_qs(p.query)


_ID_PATTERNS: dict[str, list[re.Pattern]] = {
    "youtube": [re.compile(r"(?:v=|youtu\.be/|/shorts/|/embed/|/live/|/v/)([A-Za-z0-9_-]{11})")],
    "x": [re.compile(r"/status(?:es)?/(\d+)")],
    "reddit": [re.compile(r"/comments/([a-z0-9]+)"), re.compile(r"redd\.it/([a-z0-9]+)")],
    "dailymotion": [re.compile(r"/video/([a-z0-9]+)"), re.compile(r"dai\.ly/([a-z0-9]+)")],
    "bilibili": [re.compile(r"/video/(BV[A-Za-z0-9]+|av\d+)")],
    "twitch": [re.compile(r"/videos/(\d+)"), re.compile(r"/clip/([A-Za-z0-9_-]+)"), re.compile(r"clips\.twitch\.tv/([A-Za-z0-9_-]+)")],
    "facebook": [re.compile(r"/(?:videos|reel|watch/\?v=)/?(\d+)"), re.compile(r"[?&]v=(\d+)")],
}


def media_key_from_url(url: str) -> str | None:
    """The platform's own video id, when the link carries it. Used by the blocklist."""
    pid = detect_platform(url)
    for pat in _ID_PATTERNS.get(pid or "", []):
        m = pat.search(url)
        if m:
            return m.group(1)
    return None
