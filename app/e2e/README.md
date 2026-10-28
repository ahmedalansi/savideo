# Naqi browser tests

Playwright end-to-end tests for the web app on the real API, from `/replica-test`. Test plan and results: `replica/test-plan.md`; bugs: `replica/bugs.md`.

`serve_api.py` starts Redis, Postgres, a local file server with FFmpeg-made test videos, and the API with the fixture extractor from `api/tests/conftest.py` instead of yt-dlp, so no test touches a real platform. The per-IP limits are lifted there because every test comes from 127.0.0.1 (pytest covers them).

```bash
# once
(cd ../api && python -m venv .venv && .venv/bin/pip install -r requirements-dev.txt)
(cd ../web && npm ci && NEXT_PUBLIC_API_BASE=http://localhost:8000/v1 npm run build)
npm ci

# each run (starts the API and the web app if they are not running)
LANG=C.UTF-8 npx playwright test
```

Needs `redis-server`, Postgres 16 in `/usr/lib/postgresql/16/bin`, `ffmpeg`/`ffprobe`. `LANG=C.UTF-8` keeps non-ASCII download file names in headless Chromium.

Scenario links (the video id picks it): `PRIVATEVIDx`, `LIVEVIDEOxx`, `LONGVIDEOxx`, `BROKENSTRMx` (files gone at download time); any other YouTube, Reddit or X link gives the 10-second test video.

Every test fails on a console error (expected 4xx answers aside), an uncaught page error or any 5xx, and the main screens get an axe scan.
