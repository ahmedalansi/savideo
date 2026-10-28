#!/bin/sh
# Nightly yt-dlp update (cron on the VPS, 03:00 UTC):
#   0 3 * * * cd /opt/naqi/api && sh scripts/update-ytdlp.sh >> /var/log/naqi-ytdlp.log 2>&1
# Builds an image with the latest yt-dlp, runs the canary in it, and switches
# only if every platform passes. Otherwise the running version stays.
set -eu
cd "$(dirname "$0")/.."
echo "== $(date -u +%FT%TZ) yt-dlp update"
docker build --pull --build-arg YTDLP_UPGRADE=1 -t naqi-api:candidate .
NET="$(docker compose ps -q api | xargs docker inspect -f '{{range $k, $v := .NetworkSettings.Networks}}{{$k}}{{end}}')"
POSTGRES_PASSWORD="$(grep '^POSTGRES_PASSWORD=' .env | cut -d= -f2-)"
if docker run --rm --network "$NET" --env-file .env \
     -e REDIS_URL=redis://redis:6379/0 \
     -e DATABASE_URL="postgresql://naqi:${POSTGRES_PASSWORD}@postgres:5432/naqi" \
     naqi-api:candidate python -m app.jobs; then
  docker tag naqi-api:candidate naqi-api:current
  docker compose up -d --no-build api
  echo "switched to $(docker run --rm naqi-api:current python -c 'import yt_dlp; print(yt_dlp.version.__version__)')"
else
  echo "canary failed: keeping the current yt-dlp" >&2
  exit 1
fi
