"""Postgres (replica/schema.sql): platforms, takedowns, blocklist, anonymous usage events.

The database is optional in development: without DATABASE_URL the platform
defaults from platforms.py are used, nothing is blocked, events are not
recorded and the legal/admin routes answer 503 not_configured.
"""

import time
from typing import Any

import asyncpg

from .errors import ApiError
from .platforms import DEFAULTS, Platform

_PLATFORM_TTL_S = 60


class Database:
    def __init__(self, pool: asyncpg.Pool | None):
        self.pool = pool
        self._platforms: dict[str, Platform] = {}
        self._platforms_at = 0.0

    @classmethod
    async def connect(cls, url: str | None) -> "Database":
        if not url:
            return cls(None)
        return cls(await asyncpg.create_pool(url, min_size=1, max_size=10, command_timeout=10))

    async def close(self) -> None:
        if self.pool:
            await self.pool.close()

    def require(self) -> asyncpg.Pool:
        if not self.pool:
            raise ApiError("not_configured", "The database is not configured.")
        return self.pool

    async def ping(self) -> bool | None:
        if not self.pool:
            return None
        try:
            return await self.pool.fetchval("select 1") == 1
        except Exception:
            return False

    # ---- platforms ----

    async def platforms(self) -> dict[str, Platform]:
        if not self.pool:
            return DEFAULTS
        if time.monotonic() - self._platforms_at > _PLATFORM_TTL_S:
            rows = await self.pool.fetch("select id, display_name, enabled, audio_supported, max_height, use_proxy from platforms")
            self._platforms = {r["id"]: Platform(**dict(r)) for r in rows}
            self._platforms_at = time.monotonic()
        return self._platforms

    async def update_platform(self, pid: str, fields: dict[str, Any]) -> dict:
        pool = self.require()
        allowed = {k: v for k, v in fields.items() if k in ("enabled", "audio_supported", "max_height", "use_proxy") and v is not None}
        if not allowed:
            raise ApiError("invalid_request", "Nothing to change.")
        sets = ", ".join(f"{k} = ${i + 2}" for i, k in enumerate(allowed))
        row = await pool.fetchrow(f"update platforms set {sets} where id = $1 returning *", pid, *allowed.values())
        if not row:
            raise ApiError("not_found", "No such platform.")
        self._platforms_at = 0.0
        return dict(row)

    # ---- blocklist ----

    async def is_blocked(self, platform: str, media_keys: list[str], channel_key: str | None) -> bool:
        if not self.pool or not (media_keys or channel_key):
            return False
        return bool(
            await self.pool.fetchval(
                """select exists(select 1 from blocked_media where platform_id = $1 and
                   ((scope = 'video' and media_key = any($2::text[])) or (scope = 'channel' and media_key = $3)))""",
                platform,
                media_keys,
                channel_key,
            )
        )

    async def add_block(self, platform: str, media_key: str, scope: str, reason: str, takedown_id: str | None = None) -> dict:
        row = await self.require().fetchrow(
            """insert into blocked_media (platform_id, media_key, scope, reason, takedown_request_id)
               values ($1, $2, $3, $4, $5)
               on conflict (platform_id, scope, media_key) do update set reason = excluded.reason
               returning *""",
            platform,
            media_key,
            scope,
            reason,
            takedown_id,
        )
        return dict(row)

    async def remove_block(self, block_id: str) -> bool:
        res = await self.require().execute("delete from blocked_media where id = $1", block_id)
        return res.endswith(" 1")

    async def list_blocks(self) -> list[dict]:
        return [dict(r) for r in await self.require().fetch("select * from blocked_media order by created_at desc limit 500")]

    # ---- takedowns ----

    async def insert_takedown(self, t: dict) -> dict:
        row = await self.require().fetchrow(
            """insert into takedown_requests (claimant_name, claimant_email, claimant_org, work_description, urls,
                 statement_good_faith, statement_accuracy, signature)
               values ($1, $2, $3, $4, $5, $6, $7, $8) returning id, status, created_at""",
            t["claimant_name"],
            t["claimant_email"],
            t.get("claimant_org"),
            t["work_description"],
            t["urls"],
            t["statement_good_faith"],
            t["statement_accuracy"],
            t["signature"],
        )
        return dict(row)

    async def list_takedowns(self, status: str | None) -> list[dict]:
        pool = self.require()
        if status:
            rows = await pool.fetch("select * from takedown_requests where status = $1 order by created_at desc limit 200", status)
        else:
            rows = await pool.fetch("select * from takedown_requests order by created_at desc limit 200")
        return [dict(r) for r in rows]

    async def update_takedown(self, tid: str, status: str, notes: str | None) -> dict:
        row = await self.require().fetchrow(
            "update takedown_requests set status = $2, admin_notes = coalesce($3, admin_notes) where id = $1 returning *",
            tid,
            status,
            notes,
        )
        if not row:
            raise ApiError("not_found", "No such takedown request.")
        return dict(row)

    # ---- usage events ----

    async def record_event(self, e: dict) -> None:
        if not self.pool:
            return
        await self.pool.execute(
            """insert into download_events (platform_id, kind, height, trimmed, merged, via_proxy, status, error_code, bytes_sent, duration_ms)
               values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)""",
            e["platform"],
            e["kind"],
            e.get("height"),
            e["trimmed"],
            e["merged"],
            e["via_proxy"],
            e["status"],
            e.get("error_code"),
            e["bytes_sent"],
            e["duration_ms"],
        )

    async def stats(self, days: int = 7) -> dict:
        pool = self.require()
        rows = await pool.fetch(
            """select platform_id,
                 count(*) as downloads,
                 count(*) filter (where status = 'completed') as completed,
                 count(*) filter (where status = 'failed') as failed,
                 count(*) filter (where status = 'aborted') as aborted,
                 coalesce(sum(bytes_sent), 0)::bigint as bytes,
                 coalesce(sum(bytes_sent) filter (where via_proxy), 0)::bigint as proxy_bytes
               from download_events where created_at > now() - make_interval(days => $1)
               group by platform_id order by downloads desc""",
            days,
        )
        by_platform = []
        for r in rows:
            d = dict(r)
            d["failure_rate"] = round(d["failed"] / d["downloads"], 3) if d["downloads"] else 0
            by_platform.append(d)
        return {"days": days, "by_platform": by_platform}

    async def prune_events(self, keep_days: int = 90) -> None:
        if self.pool:
            await self.pool.execute("delete from download_events where created_at < now() - make_interval(days => $1)", keep_days)
