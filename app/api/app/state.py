"""Hot state in Redis: quota counters, rate limits, FFmpeg slots, caches, tokens.

Key names follow the "Redis keys" table in architecture.md.
"""

import hashlib
import hmac
import json
import os
import secrets
from datetime import UTC, datetime, timedelta

from redis.asyncio import Redis

from .errors import ApiError


def utcnow() -> datetime:
    return datetime.now(UTC)


def iso(dt: datetime) -> str:
    return dt.isoformat().replace("+00:00", "Z")


def hour_bucket(now: datetime) -> tuple[str, datetime]:
    start = now.replace(minute=0, second=0, microsecond=0)
    return start.strftime("%Y%m%d%H"), start + timedelta(hours=1)


async def ip_hash(r: Redis, ip: str) -> str:
    """HMAC of the IP with a random salt that lives 48 h and changes daily: raw IPs are never stored."""
    day = utcnow().strftime("%Y%m%d")
    salt_key = f"salt:{day}"
    salt = await r.get(salt_key)
    if salt is None:
        await r.set(salt_key, secrets.token_hex(16), nx=True, ex=48 * 3600)
        salt = await r.get(salt_key)
    return hmac.new(salt.encode() if isinstance(salt, str) else salt, ip.encode(), hashlib.sha256).hexdigest()[:32]


async def rate_limit(r: Redis, name: str, who: str, limit: int, window_s: int) -> None:
    now = int(utcnow().timestamp())
    bucket = now // window_s
    key = f"rl:{name}:{who}:{bucket}"
    n = await r.incr(key)
    if n == 1:
        await r.expire(key, window_s + 5)
    if n > limit:
        retry = datetime.fromtimestamp((bucket + 1) * window_s, UTC)
        raise ApiError("rate_limited", "Too many requests, slow down a little.", iso(retry))


# ---- free-download quota (F04) ----------------------------------------------


async def quota_status(r: Redis, visitor: str, limit: int) -> dict:
    bucket, resets = hour_bucket(utcnow())
    used = int(await r.get(f"q:{visitor}:{bucket}") or 0)
    return {"used": min(used, limit), "limit": limit, "resets_at": iso(resets)}


async def quota_take(r: Redis, visitor: str, iph: str, limit: int, ip_limit: int) -> dict:
    """Counts one download for this browser and this IP, atomically; 429 when over either ceiling."""
    bucket, resets = hour_bucket(utcnow())
    vkey, ikey = f"q:{visitor}:{bucket}", f"qip:{iph}:{bucket}"
    async with r.pipeline(transaction=True) as p:
        p.incr(vkey).expire(vkey, 7200).incr(ikey).expire(ikey, 7200)
        used, _, ip_used, _ = await p.execute()
    if used > limit or ip_used > ip_limit:
        async with r.pipeline(transaction=True) as p:
            p.decr(vkey).decr(ikey)
            await p.execute()
        quota = {"used": limit, "limit": limit, "resets_at": iso(resets)}
        raise ApiError("quota_exceeded", "Free downloads for this hour are used up.", iso(resets), quota)
    return {"used": used, "limit": limit, "resets_at": iso(resets)}


async def quota_refund(r: Redis, visitor: str, iph: str) -> None:
    bucket, _ = hour_bucket(utcnow())
    async with r.pipeline(transaction=True) as p:
        p.decr(f"q:{visitor}:{bucket}").decr(f"qip:{iph}:{bucket}")
        await p.execute()


# ---- FFmpeg concurrency cap --------------------------------------------------


def ffmpeg_cap(configured: int) -> int:
    return configured or 2 * (os.cpu_count() or 1)


def busy_error() -> ApiError:
    return ApiError("busy", "All workers are busy.", iso(utcnow() + timedelta(seconds=5)))


async def ffmpeg_has_room(r: Redis, cap: int) -> bool:
    return int(await r.get("sem:ffmpeg") or 0) < cap


async def ffmpeg_acquire(r: Redis, cap: int) -> None:
    n = await r.incr("sem:ffmpeg")
    # Safety net: a crashed worker cannot hold slots forever.
    await r.expire("sem:ffmpeg", 6 * 3600)
    if n > cap:
        await r.decr("sem:ffmpeg")
        raise busy_error()


async def ffmpeg_release(r: Redis) -> None:
    if int(await r.decr("sem:ffmpeg")) < 0:
        await r.set("sem:ffmpeg", 0)


# ---- JSON helpers -------------------------------------------------------------


async def get_json(r: Redis, key: str) -> dict | None:
    raw = await r.get(key)
    return json.loads(raw) if raw else None


async def set_json(r: Redis, key: str, value: dict, ttl: int) -> None:
    await r.set(key, json.dumps(value, separators=(",", ":")), ex=ttl)
