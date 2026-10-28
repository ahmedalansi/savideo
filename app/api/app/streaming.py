"""Getting bytes to the browser without storing them.

- direct: one MP4 with video and audio, no trim. Bytes pass through, with
  Content-Length and Range, so the browser shows real progress and can resume.
- ffmpeg: merge separate video/audio, trim, or encode MP3. FFmpeg writes
  fragmented MP4 (or MP3) to stdout and we stream that.

Some platforms (YouTube) throttle a single long request, so yt-dlp marks
those formats with a chunk size. `ranged` fetches them in Range chunks, and
FFmpeg reads such inputs through `/internal/relay/{key}` on this service,
which does the chunking and the proxy for it.
"""

import asyncio
import re
import unicodedata
from collections.abc import AsyncIterator
from urllib.parse import quote

import httpx

READ_CHUNK = 64 * 1024
UPSTREAM_TIMEOUT = httpx.Timeout(30.0, read=60.0)


class UpstreamError(Exception):
    def __init__(self, status: int):
        super().__init__(f"upstream {status}")
        self.status = status


def client(proxy: str | None) -> httpx.AsyncClient:
    return httpx.AsyncClient(proxy=proxy, timeout=UPSTREAM_TIMEOUT, follow_redirects=True)


def parse_range(header: str | None) -> tuple[int, int | None] | None:
    """`bytes=S-` or `bytes=S-E` (single range only). Suffix ranges are not supported."""
    if not header:
        return None
    m = re.fullmatch(r"\s*bytes=(\d+)-(\d*)\s*", header)
    if not m:
        return None
    start, end = int(m.group(1)), int(m.group(2)) if m.group(2) else None
    if end is not None and end < start:
        return None
    return start, end


def _total_from(resp: httpx.Response) -> int | None:
    cr = resp.headers.get("content-range", "")
    m = re.search(r"/(\d+)$", cr)
    if m:
        return int(m.group(1))
    if resp.status_code == 200 and resp.headers.get("content-length"):
        return int(resp.headers["content-length"])
    return None


class Ranged:
    """An open upstream body from `start`, fetched in chunks when the source asks for it."""

    def __init__(self, http: httpx.AsyncClient, src: dict, start: int, end: int | None):
        self.http, self.src, self.start, self.end = http, src, start, end
        self.total: int | None = None
        self.partial = False  # upstream honoured the range
        self.content_type: str | None = None
        self._first: httpx.Response | None = None

    def _range_for(self, pos: int) -> str | None:
        chunk = self.src.get("chunk")
        last = self.end
        if chunk:
            last = pos + chunk - 1 if last is None else min(last, pos + chunk - 1)
        if pos == 0 and last is None:
            return None
        return f"bytes={pos}-{'' if last is None else last}"

    async def _open(self, pos: int) -> httpx.Response:
        headers = dict(self.src.get("headers") or {})
        rng = self._range_for(pos)
        if rng:
            headers["Range"] = rng
        req = self.http.build_request("GET", self.src["url"], headers=headers)
        resp = await self.http.send(req, stream=True)
        if resp.status_code not in (200, 206):
            await resp.aclose()
            raise UpstreamError(resp.status_code)
        return resp

    async def open(self) -> None:
        self._first = await self._open(self.start)
        self.total = _total_from(self._first)
        self.partial = self._first.status_code == 206
        self.content_type = self._first.headers.get("content-type")
        if not self.partial and self.start > 0:
            await self._first.aclose()
            raise UpstreamError(416)

    @property
    def length(self) -> int | None:
        if self.total is None:
            return None
        last = self.total - 1 if self.end is None else min(self.end, self.total - 1)
        return last - self.start + 1

    async def iter_bytes(self) -> AsyncIterator[bytes]:
        pos, resp = self.start, self._first
        try:
            while True:
                got = 0
                async for data in resp.aiter_bytes(READ_CHUNK):
                    got += len(data)
                    yield data
                await resp.aclose()
                pos += got
                done_at = self.total if self.end is None else min(self.end + 1, self.total or self.end + 1)
                # Keep going only when chunking and the file has more.
                if not (self.src.get("chunk") and self.partial and done_at and pos < done_at and got):
                    return
                resp = await self._open(pos)
        finally:
            await resp.aclose()


# ---- FFmpeg ---------------------------------------------------------------------


def _input_args(src: dict, url: str, proxy: str | None, trim: tuple[float, float] | None, relayed: bool) -> list[str]:
    args: list[str] = []
    if not relayed:
        headers = "".join(f"{k}: {v}\r\n" for k, v in (src.get("headers") or {}).items())
        if headers:
            args += ["-headers", headers]
        if proxy:
            args += ["-http_proxy", proxy]
        if src.get("protocol") in ("http", "https"):
            args += ["-reconnect", "1", "-reconnect_streamed", "1", "-reconnect_delay_max", "5"]
    if trim:
        args += ["-ss", f"{trim[0]:.3f}", "-t", f"{trim[1] - trim[0]:.3f}"]
    return args + ["-i", url]


def ffmpeg_args(spec: dict, inputs: list[tuple[dict, str, bool]], proxy: str | None, trim: tuple[float, float] | None) -> list[str]:
    """inputs: (source, url FFmpeg should open, whether that url is our relay)."""
    args = ["ffmpeg", "-hide_banner", "-nostdin", "-loglevel", "error"]
    for src, url, relayed in inputs:
        args += _input_args(src, url, proxy, trim, relayed)
    if spec["kind"] == "audio":
        args += ["-map", "0:a:0", "-vn", "-c:a", "libmp3lame", "-b:a", f"{spec['abr_kbps']}k", "-f", "mp3"]
    else:
        args += ["-map", "0:v:0"]
        args += ["-map", "1:a:0"] if len(inputs) == 2 else ["-map", "0:a:0?"]
        args += ["-c", "copy", "-movflags", "frag_keyframe+empty_moov+default_base_moof", "-f", "mp4"]
    return args + ["pipe:1"]


class FFmpegRun:
    def __init__(self, args: list[str]):
        self.args = args
        self.proc: asyncio.subprocess.Process | None = None
        self.stderr_tail = b""
        self._stderr_task: asyncio.Task | None = None

    async def start(self) -> bytes:
        """Starts FFmpeg and waits for its first bytes, so a broken input fails before we send a 200."""
        self.proc = await asyncio.create_subprocess_exec(
            *self.args, stdin=asyncio.subprocess.DEVNULL, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )
        self._stderr_task = asyncio.create_task(self._drain_stderr())
        first = await asyncio.wait_for(self.proc.stdout.read(READ_CHUNK), timeout=60)
        if not first:
            await self.proc.wait()
            await self._stderr_task
            raise RuntimeError(self.stderr_tail.decode(errors="replace")[-500:] or "ffmpeg produced no output")
        return first

    async def _drain_stderr(self) -> None:
        while chunk := await self.proc.stderr.read(4096):
            self.stderr_tail = (self.stderr_tail + chunk)[-4096:]

    async def iter_rest(self) -> AsyncIterator[bytes]:
        while data := await self.proc.stdout.read(READ_CHUNK):
            yield data

    async def finish(self) -> bool:
        """True when FFmpeg ended on its own with exit code 0; kills it otherwise."""
        if not self.proc:
            return False
        killed = False
        if self.proc.returncode is None:
            try:
                await asyncio.wait_for(self.proc.wait(), timeout=0.5)
            except TimeoutError:
                killed = True
                self.proc.kill()
                await self.proc.wait()
        if self._stderr_task:
            await self._stderr_task
        return not killed and self.proc.returncode == 0


# ---- file names ---------------------------------------------------------------


def safe_title(title: str) -> str:
    t = unicodedata.normalize("NFC", title)
    t = re.sub(r'[\\/:*?"<>|\x00-\x1f\x7f]+', " ", t)
    t = re.sub(r"\s+", " ", t).strip(" .")
    return t[:120].strip() or "video"


def content_disposition(name: str) -> str:
    """ASCII fallback plus RFC 5987 UTF-8 name, so Arabic and emoji titles survive."""
    ascii_name = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    ascii_name = re.sub(r"[^A-Za-z0-9 ._()\-]+", "_", ascii_name).strip() or "download"
    return f"attachment; filename=\"{ascii_name}\"; filename*=UTF-8''{quote(name, safe='')}"
