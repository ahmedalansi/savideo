"""Test services: a real Redis, a real Postgres, FFmpeg-made media files on a
Range-capable local HTTP server, and the API under uvicorn on a real port
(FFmpeg calls back into it through the relay). yt-dlp is replaced by
`FixtureExtractor` because tests must not depend on the platforms.
"""

import asyncio
import os
import pathlib
import shutil
import socket
import subprocess
import sys
import tempfile
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

import httpx
import pytest
import uvicorn

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app.config import Settings  # noqa: E402
from app.errors import ApiError  # noqa: E402
from app.main import create_app  # noqa: E402

PG_BIN = pathlib.Path("/usr/lib/postgresql/16/bin")
ADMIN = "test-admin-token"


def free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def wait_port(port: int, timeout: float = 20) -> None:
    end = time.time() + timeout
    while time.time() < end:
        with socket.socket() as s:
            if s.connect_ex(("127.0.0.1", port)) == 0:
                return
        time.sleep(0.1)
    raise RuntimeError(f"port {port} never opened")


# ---- media files + range server ----------------------------------------------------


class RangeHandler(SimpleHTTPRequestHandler):
    """Static files with single byte-range support, like a CDN."""

    def log_message(self, *a):
        pass

    def send_head(self):
        path = self.translate_path(self.path.split("?")[0])
        if not os.path.isfile(path):
            self.send_error(404)
            return None
        size = os.path.getsize(path)
        rng = self.headers.get("Range")
        f = open(path, "rb")
        if rng and rng.startswith("bytes="):
            s, _, e = rng[6:].partition("-")
            start, end = int(s), min(int(e) if e else size - 1, size - 1)
            if start >= size:
                f.close()
                self.send_error(416)
                return None
            self.send_response(206)
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
            self.send_header("Content-Length", str(end - start + 1))
            f.seek(start)
            self._remaining = end - start + 1
        else:
            self.send_response(200)
            self.send_header("Content-Length", str(size))
            self._remaining = size
        self.send_header("Content-Type", "video/mp4" if path.endswith(".mp4") else "application/octet-stream")
        self.send_header("Accept-Ranges", "bytes")
        self.end_headers()
        return f

    def copyfile(self, source, outputfile):
        left = self._remaining
        while left > 0:
            buf = source.read(min(65536, left))
            if not buf:
                break
            try:
                outputfile.write(buf)
            except (BrokenPipeError, ConnectionResetError):
                return
            left -= len(buf)


def make_media(d: pathlib.Path) -> None:
    ff = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y"]
    run = lambda *a: subprocess.run([*ff, *a], check=True)  # noqa: E731
    run("-f", "lavfi", "-i", "testsrc2=size=1280x720:rate=25:duration=10", "-f", "lavfi", "-i", "sine=frequency=440:duration=10",
        "-c:v", "libx264", "-preset", "ultrafast", "-g", "25", "-c:a", "aac", "-shortest", "-movflags", "+faststart", str(d / "prog720.mp4"))
    run("-f", "lavfi", "-i", "testsrc2=size=1920x1080:rate=25:duration=10", "-c:v", "libx264", "-preset", "ultrafast", "-g", "25",
        "-movflags", "+faststart", str(d / "v1080.mp4"))
    run("-f", "lavfi", "-i", "sine=frequency=660:duration=10", "-c:a", "aac", "-b:a", "128k", str(d / "a.m4a"))
    (d / "thumb.jpg").write_bytes(subprocess.run(
        [*ff, "-f", "lavfi", "-i", "testsrc2=size=320x180", "-frames:v", "1", "-f", "mjpeg", "pipe:1"], check=True, capture_output=True).stdout)


@pytest.fixture(scope="session")
def media_base():
    d = pathlib.Path(tempfile.mkdtemp(prefix="sv-media-"))
    make_media(d)
    port = free_port()
    handler = lambda *a, **k: RangeHandler(*a, directory=str(d), **k)  # noqa: E731
    srv = ThreadingHTTPServer(("127.0.0.1", port), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    yield f"http://127.0.0.1:{port}", d
    srv.shutdown()
    shutil.rmtree(d, ignore_errors=True)


# ---- fixture extractor ------------------------------------------------------------------


class FixtureExtractor:
    """Pretends to be yt-dlp. The link's video id picks the scenario."""

    def __init__(self, base: str):
        self.base = base
        self.calls = 0

    def info(self, url: str) -> dict:
        b = self.base
        if "PRIVATEVIDx" in url:
            raise ApiError("private_video", "Private video")
        if "LIVEVIDEOxx" in url:
            return {"id": "LIVEVIDEOxx", "title": "live", "is_live": True, "formats": []}
        if "LONGVIDEOxx" in url:
            return {"id": "LONGVIDEOxx", "title": "long", "duration": 5 * 3600, "formats": [{"url": f"{b}/prog720.mp4", "ext": "mp4", "height": 720, "width": 1280, "vcodec": "avc1", "acodec": "mp4a", "protocol": "http"}]}
        vid = url.split("v=")[-1][:11] if "v=" in url else "dQw4w9WgXcQ"
        # BROKENSTRMx: reads fine, but the files are gone by download time (upstream 404).
        b = f"{b}/gone" if "BROKENSTRMx" in url else b
        return {
            "id": vid,
            "title": "رحلة قصيرة / short trip: \"test\" 🎬",
            "duration": 10,
            "thumbnail": "https://example.invalid/thumb.jpg",
            "channel_id": "UCchannel" + vid[:3],
            "formats": [
                {"format_id": "18", "url": f"{b}/prog720.mp4", "ext": "mp4", "width": 1280, "height": 720, "vcodec": "avc1.64001F", "acodec": "mp4a.40.2",
                 "protocol": "http", "filesize": os.path.getsize(self._path("prog720.mp4")), "downloader_options": {"http_chunk_size": 200_000}},
                {"format_id": "137", "url": f"{b}/v1080.mp4", "ext": "mp4", "width": 1920, "height": 1080, "vcodec": "avc1.640028", "acodec": "none",
                 "protocol": "https" if b.startswith("https") else "http", "tbr": 2000, "downloader_options": {"http_chunk_size": 150_000}},
                {"format_id": "140", "url": f"{b}/a.m4a", "ext": "m4a", "vcodec": "none", "acodec": "mp4a.40.2", "abr": 128, "protocol": "http", "filesize": 160_000},
                {"format_id": "sb0", "url": f"{b}/sb.mhtml", "ext": "mhtml", "protocol": "mhtml", "vcodec": "none", "acodec": "none"},
            ],
        }

    def _path(self, name: str) -> str:
        return str(self.media_dir / name)

    async def extract(self, url, proxy):
        self.calls += 1
        await asyncio.sleep(0)
        return self.info(url)

    async def extract_playlist(self, url, proxy, limit):
        return {"_type": "playlist", "title": "Test list", "entries": [{"id": f"PLITEM{i:05d}", "title": f"Item {i}", "duration": 60} for i in range(30)]}


# ---- databases ----------------------------------------------------------------------------


@pytest.fixture(scope="session")
def redis_url():
    port = free_port()
    proc = subprocess.Popen(["redis-server", "--port", str(port), "--save", "", "--appendonly", "no"], stdout=subprocess.DEVNULL)
    wait_port(port)
    yield f"redis://127.0.0.1:{port}/0"
    proc.terminate()


@pytest.fixture(scope="session")
def database_url():
    if os.environ.get("TEST_DATABASE_URL"):
        yield os.environ["TEST_DATABASE_URL"]
        return
    if not (PG_BIN / "initdb").exists():
        pytest.skip("no Postgres available")
    d = tempfile.mkdtemp(prefix="sv-pg-")
    port = free_port()
    as_pg = ["runuser", "-u", "postgres", "--"] if os.geteuid() == 0 else []
    if as_pg:
        shutil.chown(d, "postgres")
    subprocess.run([*as_pg, str(PG_BIN / "initdb"), "-D", d, "-A", "trust", "-U", "postgres"], check=True, stdout=subprocess.DEVNULL)
    proc = subprocess.Popen([*as_pg, str(PG_BIN / "postgres"), "-D", d, "-p", str(port), "-k", d, "-c", "listen_addresses=127.0.0.1"],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    wait_port(port)
    time.sleep(0.5)
    url = f"postgresql://postgres@127.0.0.1:{port}/postgres"
    from scripts.migrate import migrate

    asyncio.run(migrate(url))
    yield url
    proc.terminate()
    proc.wait()
    shutil.rmtree(d, ignore_errors=True)


# ---- the API ----------------------------------------------------------------------------------


@pytest.fixture(scope="session")
def api(media_base, redis_url, database_url):
    base, media_dir = media_base
    port = free_port()
    settings = Settings(
        secret_key="test-secret",
        public_api_base=f"http://127.0.0.1:{port}/v1",
        internal_base=f"http://127.0.0.1:{port}",
        web_origins=["http://localhost:3000"],
        redis_url=redis_url,
        database_url=database_url,
        admin_token=ADMIN,
        ffmpeg_slots=4,
        jobs_enabled=False,
        _env_file=None,
    )
    extractor = FixtureExtractor(base)
    extractor.media_dir = media_dir
    app = create_app(settings, extractor)
    server = uvicorn.Server(uvicorn.Config(app, host="127.0.0.1", port=port, log_level="warning"))
    t = threading.Thread(target=server.run, daemon=True)
    t.start()
    wait_port(port)
    yield {"base": f"http://127.0.0.1:{port}", "extractor": extractor, "settings": settings, "media": media_dir}
    server.should_exit = True
    t.join(5)


@pytest.fixture(autouse=True)
def clean_redis(redis_url):
    import redis

    redis.Redis.from_url(redis_url).flushdb()


@pytest.fixture
def http(api):
    with httpx.Client(base_url=api["base"], timeout=60) as c:
        yield c
