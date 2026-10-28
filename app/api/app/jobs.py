"""Background jobs inside the API process (no queue: downloads stream live).

- canary, every CANARY_INTERVAL_S: resolve one known public video per platform.
  Three failures in a row set `kill:{platform}` (users see "paused") and email us;
  the next success lifts a pause the canary set. A pause set by hand stays.
- prune, hourly: delete usage events older than 90 days.

Several API workers may run; a Redis lock makes each run happen once.
The nightly yt-dlp update runs outside the process, see scripts/update-ytdlp.sh.
"""

import asyncio
import contextlib
import logging
import time

from . import notify
from .extractor import build_media
from .state import get_json, set_json

log = logging.getLogger("naqi")


async def _once(c, name: str, every_s: int) -> bool:
    return bool(await c.redis.set(f"lock:job:{name}", "1", nx=True, ex=max(every_s - 5, 30)))


async def run_canary(c, record: bool = True) -> dict:
    platforms = await c.db.platforms()
    results = {}
    for pid, url in c.settings.canary_urls.items():
        p = platforms.get(pid)
        if not p or not p.enabled:
            continue
        started = time.monotonic()
        try:
            info = await c.extractor.extract(url, None)
            build_media(info, p, c.settings.max_duration_s, c.settings.max_audio_duration_s)
            ok, error = True, None
        except Exception as e:  # any failure counts
            ok, error = False, f"{type(e).__name__}: {getattr(e, 'message', e)}"[:300]
        result = {"ok": ok, "error": error, "ms": int((time.monotonic() - started) * 1000), "at": int(time.time())}
        results[pid] = result
        if not record:
            continue
        await set_json(c.redis, f"canary:{pid}", result, 7 * 86400)
        if ok:
            await c.redis.delete(f"canaryfail:{pid}")
            if await c.redis.get(f"kill:{pid}") == "canary":
                await c.redis.delete(f"kill:{pid}")
        else:
            fails = await c.redis.incr(f"canaryfail:{pid}")
            if fails >= 3 and not await c.redis.exists(f"kill:{pid}"):
                await c.redis.set(f"kill:{pid}", "canary")
                await notify.platform_paused(c.settings, pid, error or "")
    return results


async def canary_results(c) -> dict:
    out = {}
    for pid in c.settings.canary_urls:
        r = await get_json(c.redis, f"canary:{pid}")
        if r is not None:
            r["paused"] = bool(await c.redis.exists(f"kill:{pid}"))
            out[pid] = r
    return out


async def _loop(c) -> None:
    last_prune = 0.0
    while True:
        try:
            if c.settings.canary_urls and await _once(c, "canary", c.settings.canary_interval_s):
                await run_canary(c)
            if time.monotonic() - last_prune > 3600 and await _once(c, "prune", 3600):
                await c.db.prune_events()
                last_prune = time.monotonic()
        except asyncio.CancelledError:
            raise
        except Exception:
            log.exception("job loop error")
        await asyncio.sleep(min(c.settings.canary_interval_s, 300))


def start(c) -> asyncio.Task:
    return asyncio.create_task(_loop(c))


async def main() -> int:
    """`python -m app.jobs`: run the canary once, report only, exit 0 if every platform passed (used by update-ytdlp.sh)."""
    from redis.asyncio import Redis

    from .config import get_settings
    from .db import Database
    from .extractor import YtDlpExtractor
    from .main import Ctx

    s = get_settings()
    c = Ctx(s, Redis.from_url(s.redis_url, decode_responses=True), await Database.connect(s.database_url), YtDlpExtractor(s.cookies_file))
    try:
        # A candidate yt-dlp is being tested: report only, never pause platforms.
        results = await run_canary(c, record=False)
    finally:
        with contextlib.suppress(Exception):
            await c.db.close()
            await c.redis.aclose()
    for pid, r in results.items():
        print(f"{pid:12} {'ok' if r['ok'] else 'FAIL'} {r['ms']} ms {r['error'] or ''}")
    return 0 if results and all(r["ok"] for r in results.values()) else 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
