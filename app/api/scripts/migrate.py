"""Applies migrations/*.sql in order, once each. Run: python scripts/migrate.py (uses DATABASE_URL)."""

import asyncio
import os
import pathlib
import sys

import asyncpg

MIGRATIONS = pathlib.Path(__file__).resolve().parent.parent / "migrations"


async def migrate(url: str) -> list[str]:
    conn = await asyncpg.connect(url)
    try:
        await conn.execute("create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())")
        done = {r["name"] for r in await conn.fetch("select name from schema_migrations")}
        applied = []
        for path in sorted(MIGRATIONS.glob("*.sql")):
            if path.name in done:
                continue
            async with conn.transaction():
                await conn.execute(path.read_text())
                await conn.execute("insert into schema_migrations (name) values ($1)", path.name)
            applied.append(path.name)
        return applied
    finally:
        await conn.close()


if __name__ == "__main__":
    url = os.environ.get("DATABASE_URL")
    if not url:
        sys.exit("DATABASE_URL is not set")
    names = asyncio.run(migrate(url))
    print("applied: " + (", ".join(names) if names else "nothing new"))
