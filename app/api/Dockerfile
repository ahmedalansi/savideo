FROM python:3.12-slim

# FFmpeg merges, trims and encodes MP3. Debian's build includes libmp3lame.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /srv
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# scripts/update-ytdlp.sh builds a candidate with YTDLP_UPGRADE=1 and only
# switches to it when the canary passes.
ARG YTDLP_UPGRADE=0
RUN if [ "$YTDLP_UPGRADE" = "1" ]; then pip install --no-cache-dir -U "yt-dlp[default,deno,curl-cffi]"; fi

COPY app ./app
COPY migrations ./migrations
COPY scripts ./scripts

RUN useradd --system --uid 10001 naqi
USER naqi

EXPOSE 8000
# Migrations run on start, then two workers. Caddy in front sets X-Forwarded-For.
CMD ["sh", "-c", "python scripts/migrate.py && exec uvicorn app.main:create_app --factory --host 0.0.0.0 --port 8000 --workers 2 --proxy-headers --forwarded-allow-ips '*' --timeout-graceful-shutdown 30"]
