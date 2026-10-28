"""Local API for the browser tests: real Redis, Postgres, FFmpeg and the API,
with yt-dlp swapped for the FixtureExtractor from api/tests (no platform is
ever contacted). The link's video id picks the scenario (see FixtureExtractor):
PRIVATEVIDx, LIVEVIDEOxx, LONGVIDEOxx, BROKENSTRMx (files gone at download time).

Run: ../api/.venv/bin/python serve_api.py  (port from E2E_API_PORT, default 8000)
"""

import asyncio
import os
import pathlib
import shutil
import subprocess
import sys
import tempfile
import threading
import time

ROOT = pathlib.Path(__file__).resolve().parent.parent / "api"
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "tests"))

import uvicorn  # noqa: E402
from http.server import ThreadingHTTPServer  # noqa: E402

from app.config import Settings  # noqa: E402
from app.main import create_app  # noqa: E402
from conftest import PG_BIN, FixtureExtractor, RangeHandler, free_port, make_media, wait_port  # noqa: E402


def main() -> None:
    port = int(os.environ.get("E2E_API_PORT", "8000"))
    web = os.environ.get("E2E_WEB_ORIGIN", "http://localhost:3000")
    procs: list[subprocess.Popen] = []

    media = pathlib.Path(tempfile.mkdtemp(prefix="sv-e2e-media-"))
    make_media(media)
    mport = free_port()
    srv = ThreadingHTTPServer(("127.0.0.1", mport), lambda *a, **k: RangeHandler(*a, directory=str(media), **k))
    threading.Thread(target=srv.serve_forever, daemon=True).start()

    rport = free_port()
    procs.append(subprocess.Popen(["redis-server", "--port", str(rport), "--save", "", "--appendonly", "no"], stdout=subprocess.DEVNULL))
    wait_port(rport)

    pgdir = tempfile.mkdtemp(prefix="sv-e2e-pg-")
    pport = free_port()
    as_pg = ["runuser", "-u", "postgres", "--"] if os.geteuid() == 0 else []
    if as_pg:
        shutil.chown(pgdir, "postgres")
    subprocess.run([*as_pg, str(PG_BIN / "initdb"), "-D", pgdir, "-A", "trust", "-U", "postgres"], check=True, stdout=subprocess.DEVNULL)
    procs.append(subprocess.Popen([*as_pg, str(PG_BIN / "postgres"), "-D", pgdir, "-p", str(pport), "-k", pgdir, "-c", "listen_addresses=127.0.0.1"],
                                  stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL))
    wait_port(pport)
    time.sleep(0.5)
    db = f"postgresql://postgres@127.0.0.1:{pport}/postgres"
    from scripts.migrate import migrate

    asyncio.run(migrate(db))

    settings = Settings(
        secret_key="e2e-secret",
        public_api_base=f"http://localhost:{port}/v1",
        internal_base=f"http://127.0.0.1:{port}",
        web_origins=[web],
        redis_url=f"redis://127.0.0.1:{rport}/0",
        database_url=db,
        admin_token="e2e-admin",
        ffmpeg_slots=int(os.environ.get("E2E_FFMPEG_SLOTS", "4")),
        jobs_enabled=False,
        # Every test shares 127.0.0.1, so the per-IP ceilings are lifted here;
        # the pytest suite covers them.
        quota_ip_limit=10_000,
        resolve_per_min=10_000,
        playlist_per_min=10_000,
        _env_file=None,
    )
    ex = FixtureExtractor(f"http://127.0.0.1:{mport}")
    ex.media_dir = media
    try:
        uvicorn.run(create_app(settings, ex), host="127.0.0.1", port=port, log_level="warning")
    finally:
        for p in procs:
            p.terminate()
        srv.shutdown()
        shutil.rmtree(media, ignore_errors=True)


if __name__ == "__main__":
    main()
