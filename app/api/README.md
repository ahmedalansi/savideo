# savideo API

FastAPI service from `replica/architecture.md`: yt-dlp reads the video, FFmpeg merges, trims and encodes MP3, and the file is **streamed to the browser without being stored**. Redis holds the free-download counters, caches and download tokens; Postgres holds takedowns, the blocklist, platform switches and anonymous usage counts.

## Run it on a laptop

Needs Python 3.12, FFmpeg and Redis (Postgres optional).

```bash
python -m venv .venv && . .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env              # set SECRET_KEY, PUBLIC_API_BASE=http://localhost:8000/v1,
                                  # WEB_ORIGINS=["http://localhost:3000"], COOKIE_SECURE=false
redis-server &                    # or: docker run -p 6379:6379 redis:7.4-alpine
uvicorn app.main:create_app --factory --reload --port 8000
```

Then in `../web/.env.local`: `NEXT_PUBLIC_API_BASE=http://localhost:8000/v1`, and `npm run dev`.
Without `DATABASE_URL` the platform defaults from `app/platforms.py` apply, nothing is blocked and the takedown/admin routes answer 503.
API docs: http://localhost:8000/v1/docs

## Tests

```bash
pytest -q
```

The tests start their own Redis and Postgres (from `/usr/lib/postgresql/16/bin`, or set `TEST_DATABASE_URL`), make test videos with FFmpeg, serve them from a local server that supports byte ranges, and run the API on a real port. yt-dlp is swapped for `FixtureExtractor`, so no test touches YouTube or any other platform. `tests/test_units.py` covers format picking, error mapping, URL handling and file names against yt-dlp-shaped data.

## Deploy (one VPS)

```bash
# /opt/naqi/api and /opt/naqi/web side by side (the site is built from ../web)
cp .env.example .env    # fill in every value; WEB_DOMAIN, www.WEB_DOMAIN and API_DOMAIN must point at the VPS
docker compose up -d --build
sh scripts/smoke.sh $WEB_DOMAIN $API_DOMAIN
```

Compose runs `web` (the Next.js site), `api` (two uvicorn workers; migrations run on start), `redis`, `postgres` and `caddy` (automatic HTTPS, streams without buffering, only routes `/v1/*` and `/health*` on the API domain). Full steps in Arabic: `replica/deploy.md`.
Nightly yt-dlp update with a canary gate: add the cron line from `scripts/update-ytdlp.sh`.

## Admin

All `/v1/admin/*` routes need `Authorization: Bearer $ADMIN_TOKEN`.

```bash
H="Authorization: Bearer $ADMIN_TOKEN"; A=https://$API_DOMAIN/v1/admin
curl -H "$H" "$A/takedowns?status=new"
curl -H "$H" -X PATCH "$A/takedowns/<id>" -H 'content-type: application/json' -d '{"status":"accepted"}'
curl -H "$H" -X POST "$A/blocked" -H 'content-type: application/json' -d '{"platform_id":"youtube","media_key":"<video id>","reason":"..."}'
curl -H "$H" -X PATCH "$A/platforms/youtube" -H 'content-type: application/json' -d '{"max_height":1080}'
curl -H "$H" "$A/stats?days=7"
```

Emergency stop for one platform without a deploy: `docker compose exec redis redis-cli set kill:youtube admin` (delete the key to resume).

## Layout

| file | what |
| --- | --- |
| `app/main.py` | routes, app factory |
| `app/extractor.py` | yt-dlp wrapper, picking one format per quality, error mapping |
| `app/streaming.py` | Range pass-through, chunked upstream reads, FFmpeg runs, file names |
| `app/state.py` | Redis: quota, rate limits, FFmpeg slots, hashed IPs |
| `app/visitor.py` | signed anonymous visitor cookie |
| `app/db.py` | Postgres access |
| `app/jobs.py` | canary + kill switch, event pruning; `python -m app.jobs` runs the canary once |
| `app/platforms.py` | the seven platforms, host matching, video ids from links |
| `migrations/` | SQL, applied in order by `scripts/migrate.py` |
