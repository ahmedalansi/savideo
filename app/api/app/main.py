"""Naqi API: the routes from architecture.md, under /v1."""

import contextlib
import hashlib
import json
import hmac
import secrets
import time
from datetime import timedelta
from contextlib import asynccontextmanager
from typing import Literal
from urllib.parse import urlencode

import anyio
import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, FastAPI, Header, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, Response, StreamingResponse
from pydantic import BaseModel, EmailStr, Field
from redis.asyncio import Redis

from . import jobs, notify
from .config import Settings, get_settings
from .db import Database
from .errors import ApiError, api_error_handler, validation_handler
from .extractor import Extractor, YtDlpExtractor, build_media, build_playlist, is_bot_block
from .platforms import Platform, detect_platform, is_playlist, media_key_from_url, normalize, parse_url
from .state import (
    busy_error,
    ffmpeg_acquire,
    ffmpeg_cap,
    ffmpeg_has_room,
    ffmpeg_release,
    get_json,
    ip_hash,
    iso,
    quota_refund,
    quota_status,
    quota_take,
    rate_limit,
    set_json,
    utcnow,
)
from .streaming import (
    FFmpegRun,
    Ranged,
    UpstreamError,
    client,
    content_disposition,
    ffmpeg_args,
    parse_range,
    safe_title,
)
from .visitor import VisitorMiddleware

RELAY_TTL_S = 6 * 3600
# How often one download link may be fetched. Direct files allow resumes (Range);
# an FFmpeg run allows one restart. Past that the link is spent, so one free
# download cannot be replayed or shared.
DIRECT_USES = 20
FFMPEG_USES = 2


class Ctx:
    """Shared services for one app instance."""

    def __init__(self, settings: Settings, redis: Redis, db: Database, extractor: Extractor):
        self.settings, self.redis, self.db, self.extractor = settings, redis, db, extractor

    def proxy(self, session: str | None) -> str | None:
        if not session or not self.settings.proxy_url:
            return None
        return self.settings.proxy_url.replace("{session}", session)

    def sign(self, value: str) -> str:
        return hmac.new(self.settings.secret_key.encode(), value.encode(), hashlib.sha256).hexdigest()[:32]

    def thumb_url(self, url: str | None) -> str | None:
        if not url or not url.startswith("https://"):
            return None
        return f"{self.settings.public_api_base}/thumbnail?{urlencode({'u': url, 's': self.sign(url)})}"


def ctx(request: Request) -> Ctx:
    return request.app.state.ctx


async def client_hash(request: Request, c: Ctx = Depends(ctx)) -> str:
    return await ip_hash(c.redis, request.client.host if request.client else "0.0.0.0")


# ---- models -----------------------------------------------------------------------


class ResolveIn(BaseModel):
    # parse_url refuses anything over 2048 characters as invalid_url; this only caps the body.
    url: str = Field(max_length=16_384)


class DownloadIn(BaseModel):
    media_id: str = Field(pattern=r"^m_[a-f0-9]{20}$")
    format_id: str = Field(pattern=r"^[av]\d{2,4}$")
    kind: Literal["video", "audio"]
    trim_start_s: float | None = Field(default=None, ge=0)
    trim_end_s: float | None = Field(default=None, gt=0)


class TakedownIn(BaseModel):
    claimant_name: str = Field(min_length=1, max_length=200)
    claimant_email: EmailStr
    claimant_org: str | None = Field(default=None, max_length=200)
    work_description: str = Field(min_length=1, max_length=5000)
    urls: list[str] = Field(min_length=1, max_length=50)
    statement_good_faith: Literal[True]
    statement_accuracy: Literal[True]
    signature: str = Field(min_length=1, max_length=200)
    captcha_token: str | None = Field(default=None, max_length=4096)


class TakedownPatch(BaseModel):
    status: Literal["new", "reviewing", "accepted", "rejected"]
    admin_notes: str | None = Field(default=None, max_length=5000)


class BlockIn(BaseModel):
    platform_id: str
    media_key: str = Field(min_length=1, max_length=200)
    scope: Literal["video", "channel"] = "video"
    reason: str = Field(min_length=1, max_length=500)


class PlatformPatch(BaseModel):
    enabled: bool | None = None
    audio_supported: bool | None = None
    max_height: int | None = Field(default=None, gt=0, le=4320)
    use_proxy: bool | None = None


# ---- helpers ----------------------------------------------------------------------


async def platform_for(c: Ctx, url: str) -> Platform:
    pid = detect_platform(url)
    if not pid:
        raise ApiError("unsupported_site")
    p = (await c.db.platforms()).get(pid)
    if not p or not p.enabled or await c.redis.exists(f"kill:{pid}"):
        raise ApiError("platform_down", f"{pid} is paused")
    return p


async def extract(c: Ctx, url: str, p: Platform, playlist: bool = False) -> tuple[dict, str | None]:
    """Server IP first; for proxy platforms, retry once through a new sticky proxy session on a block."""

    async def run(session: str | None) -> dict:
        proxy = c.proxy(session)
        if playlist:
            return await c.extractor.extract_playlist(url, proxy, c.settings.playlist_max_items)
        return await c.extractor.extract(url, proxy)

    try:
        return await run(None), None
    except ApiError as e:
        if not (p.use_proxy and c.settings.proxy_url and is_bot_block(e)):
            raise
    session = secrets.token_hex(8)
    return await run(session), session


def public_media(c: Ctx, media_id: str, m: dict) -> dict:
    return {
        "media_id": media_id,
        "platform": m["platform"],
        "title": m["title"],
        "duration_s": m["duration_s"],
        "thumbnail_url": c.thumb_url(m.get("thumbnail")),
        "formats": m["formats"],
        "audio_supported": m["audio_supported"],
    }


async def check_blocked(c: Ctx, m: dict) -> None:
    keys = list(m["media_keys"]) + ([m["url_key"]] if m.get("url_key") else [])
    if await c.db.is_blocked(m["platform"], keys, m.get("channel_key")):
        raise ApiError("blocked", "This video is unavailable here after a copyright request.")


async def require_admin(authorization: str | None = Header(default=None), c: Ctx = Depends(ctx)) -> None:
    token = c.settings.admin_token
    given = (authorization or "").removeprefix("Bearer ").strip()
    if not token or not given or not hmac.compare_digest(given, token):
        raise ApiError("unauthorized", "Admin token required.")


def no_store(resp: Response) -> None:
    resp.headers["Cache-Control"] = "no-store"


# ---- routes: download (F01-F04) -----------------------------------------------------

v1 = APIRouter(prefix="/v1")


@v1.post("/media/resolve")
async def resolve_media(body: ResolveIn, response: Response, c: Ctx = Depends(ctx), iph: str = Depends(client_hash)) -> dict:
    url = parse_url(body.url)
    if not url:
        raise ApiError("invalid_url")
    p = await platform_for(c, url)
    if is_playlist(url):
        raise ApiError("invalid_url", "This is a playlist link; use /playlists/resolve.")
    await rate_limit(c.redis, "resolve", iph, c.settings.resolve_per_min, 60)

    media_id = "m_" + hashlib.sha256(normalize(url).encode()).hexdigest()[:20]
    m = await get_json(c.redis, f"media:{media_id}")
    if m is None:
        info, session = await extract(c, url, p)
        media, streams = build_media(info, p, c.settings.max_duration_s, c.settings.max_audio_duration_s)
        m = {**media, "platform": p.id, "url_key": media_key_from_url(url), "session": session, "streams": streams}
        await set_json(c.redis, f"media:{media_id}", m, c.settings.media_cache_s)
    await check_blocked(c, m)
    no_store(response)
    return public_media(c, media_id, m)


@v1.post("/downloads")
async def create_download(body: DownloadIn, request: Request, response: Response, c: Ctx = Depends(ctx), iph: str = Depends(client_hash)) -> dict:
    s = c.settings
    m = await get_json(c.redis, f"media:{body.media_id}")
    if m is None:
        raise ApiError("link_expired", "Paste the video link again.")
    spec = m["streams"].get(body.format_id)
    fmt = next((f for f in m["formats"] if f["format_id"] == body.format_id), None)
    if not spec or not fmt or spec["kind"] != body.kind:
        raise ApiError("invalid_request", "Unknown format for this video.")

    duration = m["duration_s"]
    trim = None
    if body.trim_start_s is not None or body.trim_end_s is not None:
        start = body.trim_start_s or 0.0
        end = body.trim_end_s if body.trim_end_s is not None else float(duration)
        if not duration or end > duration + 1 or end - start < 1:
            raise ApiError("invalid_request", "Trim times are outside the video or under 1 second.")
        end = min(end, float(duration))
        if start > 0 or end < duration:
            trim = (start, end)

    size = fmt["size_estimate"]
    if size is not None and trim and duration:
        size = round(size * (trim[1] - trim[0]) / duration)
    if size is not None and size > s.max_bytes:
        raise ApiError("too_large")
    await check_blocked(c, m)
    uses_ffmpeg = spec["mode"] == "ffmpeg" or trim is not None
    if uses_ffmpeg and not await ffmpeg_has_room(c.redis, ffmpeg_cap(s.ffmpeg_slots)):
        raise busy_error()

    quota = await quota_take(c.redis, request.state.visitor, iph, s.quota_limit, s.quota_ip_limit)
    token = secrets.token_urlsafe(24)
    label = f"{spec['abr_kbps']}kbps" if spec["kind"] == "audio" else f"{spec['height']}p"
    payload = {
        "spec": spec,
        "title": m["title"],
        "platform": m["platform"],
        "session": m["session"],
        "trim": trim,
        "label": label + (" clip" if trim else ""),
        "ext": fmt["ext"],
        "size": size,
    }
    # Who to refund if the stream fails before the first byte.
    payload["visitor"], payload["iph"] = request.state.visitor, iph
    await set_json(c.redis, f"dl:{token}", payload, s.token_ttl_s)
    no_store(response)
    return {
        "download_url": f"{s.public_api_base}/downloads/{token}",
        "expires_at": iso(utcnow() + timedelta(seconds=s.token_ttl_s)),
        "size_estimate": size,
        "quota": quota,
    }


@v1.get("/quota")
async def get_quota(request: Request, response: Response, c: Ctx = Depends(ctx)) -> dict:
    no_store(response)
    return await quota_status(c.redis, request.state.visitor, c.settings.quota_limit)


def _event(payload: dict, via_proxy: bool) -> dict:
    spec = payload["spec"]
    return {
        "platform": payload["platform"],
        "kind": spec["kind"],
        "height": spec.get("height"),
        "trimmed": payload["trim"] is not None,
        "merged": bool(spec.get("video") and spec.get("audio")),
        "via_proxy": via_proxy,
        "status": "failed",
        "error_code": None,
        "bytes_sent": 0,
        "duration_ms": 0,
    }


async def _record(c: Ctx, event: dict, started: float) -> None:
    event["duration_ms"] = int((time.monotonic() - started) * 1000)
    with contextlib.suppress(Exception):
        await c.db.record_event(event)


async def passthrough(c: Ctx, src: dict, proxy: str | None, range_header: str | None, headers: dict, event: dict | None) -> Response:
    """Streams one upstream file as is, honouring Range."""
    rng = parse_range(range_header)
    start, end = rng if rng else (0, None)
    http = client(proxy)
    up = Ranged(http, src, start, end)
    started = time.monotonic()
    try:
        await up.open()
    except UpstreamError as e:
        await http.aclose()
        if e.status == 416:
            return Response(status_code=416)
        if event:
            event["error_code"] = f"upstream_{e.status}"
            await _record(c, event, started)
        raise ApiError("platform_down", f"Upstream answered {e.status}.") from e
    except httpx.HTTPError as e:
        await http.aclose()
        raise ApiError("platform_down", "Could not reach the platform.") from e

    out = dict(headers)
    status = 200
    if up.total is not None:
        out["Accept-Ranges"] = "bytes"
        out["Content-Length"] = str(up.length)
        if rng and up.partial:
            status = 206
            out["Content-Range"] = f"bytes {start}-{start + up.length - 1}/{up.total}"
    out.setdefault("Content-Type", up.content_type or "application/octet-stream")

    async def body():
        sent, ok = 0, False
        try:
            async for data in up.iter_bytes():
                sent += len(data)
                yield data
            ok = True
        finally:
            with anyio.CancelScope(shield=True):
                await http.aclose()
                if event:
                    event.update(status="completed" if ok else "aborted", bytes_sent=sent)
                    await _record(c, event, started)

    return StreamingResponse(body(), status_code=status, headers=out)


def is_navigation(request: Request) -> bool:
    """The browser opened the link itself (our download button), rather than a script fetching it."""
    return request.headers.get("sec-fetch-mode") == "navigate" or "text/html" in request.headers.get("accept", "")


@v1.get("/downloads/{token}")
async def stream_download(token: str, request: Request, c: Ctx = Depends(ctx)) -> Response:
    payload = await get_json(c.redis, f"dl:{token}") if len(token) < 64 else None
    try:
        if payload is None:
            raise ApiError("link_expired", "This download link has expired. Start the download again.")
        direct = payload["spec"]["mode"] == "direct" and payload["trim"] is None
        uses = await c.redis.incr(f"dlu:{token}")
        if uses == 1:
            await c.redis.expire(f"dlu:{token}", c.settings.token_ttl_s)
        if uses > (DIRECT_USES if direct else FFMPEG_USES):
            raise ApiError("link_expired", "This download link was already used. Start the download again.")
        try:
            return await _stream(token, payload, request, c)
        except ApiError:
            # Nothing reached the visitor, so the free download goes back, once per link.
            if "visitor" in payload and await c.redis.set(f"refund:{token}", 1, nx=True, ex=c.settings.token_ttl_s):
                await quota_refund(c.redis, payload["visitor"], payload["iph"])
            raise
    except ApiError as e:
        if not is_navigation(request):
            raise
        # The download button navigates to this link. Answering with JSON would replace
        # the site with raw text, so send the visitor back to the site with the reason.
        web = c.settings.web_origins[0].rstrip("/")
        return RedirectResponse(f"{web}/?{urlencode({'download_error': e.code})}", status_code=303, headers={"Cache-Control": "no-store"})


async def _stream(token: str, payload: dict, request: Request, c: Ctx) -> Response:
    spec, trim, session = payload["spec"], payload["trim"], payload["session"]
    proxy = c.proxy(session)
    name = f"{safe_title(payload['title'])} ({payload['label']}).{payload['ext']}"
    headers = {
        "Content-Disposition": content_disposition(name),
        "Content-Type": "audio/mpeg" if spec["kind"] == "audio" else "video/mp4",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
    }
    event = _event(payload, via_proxy=proxy is not None)

    if spec["mode"] == "direct" and trim is None:
        return await passthrough(c, spec["video"], proxy, request.headers.get("range"), headers, event)

    # Merge, trim or MP3: FFmpeg writes to a pipe and we stream it.
    cap = ffmpeg_cap(c.settings.ffmpeg_slots)
    await ffmpeg_acquire(c.redis, cap)
    relay_keys: list[str] = []
    inputs = []
    for src in (spec["video"], spec["audio"]):
        if not src:
            continue
        if src["protocol"] in ("http", "https") and src.get("chunk"):
            key = secrets.token_urlsafe(18)
            await set_json(c.redis, f"relay:{key}", {"src": src, "session": session}, RELAY_TTL_S)
            relay_keys.append(key)
            inputs.append((src, f"{c.settings.internal_base}/internal/relay/{key}", True))
        else:
            inputs.append((src, src["url"], False))
    run = FFmpegRun(ffmpeg_args(spec, inputs, proxy, tuple(trim) if trim else None))
    started = time.monotonic()

    async def cleanup(ok: bool, sent: int, error: str | None = None):
        with anyio.CancelScope(shield=True):
            await ffmpeg_release(c.redis)
            if relay_keys:
                await c.redis.delete(*[f"relay:{k}" for k in relay_keys])
            event.update(status="completed" if ok else ("failed" if error else "aborted"), bytes_sent=sent, error_code=error)
            await _record(c, event, started)

    try:
        first = await run.start()
    except Exception as e:
        await run.finish()
        await cleanup(False, 0, "ffmpeg_start")
        raise ApiError("platform_down", "Could not read the video from the platform.") from e

    if payload["ext"] == "mp4":
        headers["X-Size-Estimate"] = str(payload["size"] or "")

    async def body():
        sent, ok = len(first), False
        try:
            yield first
            async for data in run.iter_rest():
                sent += len(data)
                yield data
            ok = True
        finally:
            with anyio.CancelScope(shield=True):
                clean = await run.finish()
            await cleanup(ok and clean, sent, None if ok and clean else ("ffmpeg_exit" if ok else None))

    return StreamingResponse(body(), headers=headers)


@v1.get("/thumbnail")
async def thumbnail(u: str = Query(max_length=4096), s: str = Query(max_length=64), c: Ctx = Depends(ctx)) -> Response:
    if not hmac.compare_digest(s, c.sign(u)):
        raise ApiError("not_found", "Unknown thumbnail.")
    async with client(None) as http:
        try:
            r = await http.get(u, headers={"User-Agent": "Mozilla/5.0"})
        except httpx.HTTPError as e:
            raise ApiError("not_found", "Thumbnail unavailable.") from e
    ctype = r.headers.get("content-type", "")
    if r.status_code != 200 or not ctype.startswith("image/") or len(r.content) > 5_000_000:
        raise ApiError("not_found", "Thumbnail unavailable.")
    return Response(r.content, media_type=ctype, headers={"Cache-Control": "public, max-age=86400"})


@v1.post("/playlists/resolve")
async def resolve_playlist(body: ResolveIn, response: Response, c: Ctx = Depends(ctx), iph: str = Depends(client_hash)) -> dict:
    url = parse_url(body.url)
    if not url or not is_playlist(url):
        raise ApiError("invalid_url")
    p = await platform_for(c, url)
    await rate_limit(c.redis, "playlist", iph, c.settings.playlist_per_min, 60)
    key = "pl:" + hashlib.sha256(normalize(url).encode()).hexdigest()[:20]
    pl = await get_json(c.redis, key)
    if pl is None:
        info, _ = await extract(c, url, p, playlist=True)
        pl = build_playlist(info, c.settings.playlist_max_items)
        await set_json(c.redis, key, pl, c.settings.media_cache_s)
    for item in pl["items"]:
        item["thumbnail_url"] = c.thumb_url(item["thumbnail_url"])
    no_store(response)
    return pl


# ---- routes: legal ------------------------------------------------------------------


@v1.post("/takedowns", status_code=201)
async def create_takedown(body: TakedownIn, request: Request, tasks: BackgroundTasks, c: Ctx = Depends(ctx), iph: str = Depends(client_hash)) -> dict:
    c.db.require()
    await rate_limit(c.redis, "takedown", iph, c.settings.takedowns_per_hour, 3600)
    if c.settings.turnstile_secret and not await notify.turnstile_ok(c.settings.turnstile_secret, body.captcha_token, request.client.host if request.client else None):
        raise ApiError("invalid_request", "Captcha check failed.")
    urls = [u.strip() for u in body.urls if u.strip()]
    if not urls or any(not parse_url(u) or not u.startswith(("http://", "https://")) for u in urls):
        raise ApiError("invalid_request", "urls: each must be a full link.")
    row = await c.db.insert_takedown(body.model_dump(exclude={"captcha_token"}) | {"urls": urls})
    tasks.add_task(notify.new_takedown, c.settings, str(row["id"]), len(urls))
    return {"id": str(row["id"]), "status": row["status"]}


# ---- routes: admin --------------------------------------------------------------------

admin = APIRouter(prefix="/v1/admin", dependencies=[Depends(require_admin)])


@admin.get("/takedowns")
async def list_takedowns(status: str | None = None, c: Ctx = Depends(ctx)) -> list[dict]:
    return await c.db.list_takedowns(status)


@admin.patch("/takedowns/{tid}")
async def patch_takedown(tid: str, body: TakedownPatch, c: Ctx = Depends(ctx)) -> dict:
    row = await c.db.update_takedown(tid, body.status, body.admin_notes)
    unmatched: list[str] = []
    if body.status == "accepted":
        # Block every link we can map to a platform + video id; the rest is listed for manual blocking.
        for u in row["urls"]:
            url = parse_url(u)
            pid, key = (detect_platform(url), media_key_from_url(url)) if url else (None, None)
            if pid and key:
                await c.db.add_block(pid, key, "video", f"takedown {tid}", tid)
            else:
                unmatched.append(u)
    return row | {"unmatched_urls": unmatched}


@admin.get("/blocked")
async def list_blocked(c: Ctx = Depends(ctx)) -> list[dict]:
    return await c.db.list_blocks()


@admin.post("/blocked", status_code=201)
async def add_blocked(body: BlockIn, c: Ctx = Depends(ctx)) -> dict:
    if body.platform_id not in await c.db.platforms():
        raise ApiError("invalid_request", "Unknown platform.")
    return await c.db.add_block(body.platform_id, body.media_key, body.scope, body.reason)


@admin.delete("/blocked/{bid}", status_code=204)
async def delete_blocked(bid: str, c: Ctx = Depends(ctx)) -> Response:
    if not await c.db.remove_block(bid):
        raise ApiError("not_found", "No such block.")
    return Response(status_code=204)


@admin.patch("/platforms/{pid}")
async def patch_platform(pid: str, body: PlatformPatch, c: Ctx = Depends(ctx)) -> dict:
    return await c.db.update_platform(pid, body.model_dump())


@admin.get("/stats")
async def stats(days: int = Query(default=7, ge=1, le=90), c: Ctx = Depends(ctx)) -> dict:
    out = await c.db.stats(days)
    out["ffmpeg_running"] = int(await c.redis.get("sem:ffmpeg") or 0)
    out["killed_platforms"] = sorted([k.split(":", 1)[1] async for k in c.redis.scan_iter("kill:*")])
    return out


# ---- routes: ops ---------------------------------------------------------------------

ops = APIRouter()


@ops.get("/health")
async def health(c: Ctx = Depends(ctx)) -> dict:
    import yt_dlp

    try:
        redis_ok = bool(await c.redis.ping())
    except Exception:
        redis_ok = False
    return {"ok": redis_ok, "redis": redis_ok, "db": await c.db.ping(), "yt_dlp": yt_dlp.version.__version__}


@ops.get("/health/canary")
async def canary(c: Ctx = Depends(ctx)) -> Response:
    results = await jobs.canary_results(c)
    ok = all(r.get("ok") for r in results.values()) if results else True
    return Response(json.dumps({"ok": ok, "platforms": results}), status_code=200 if ok else 503, media_type="application/json")


@ops.get("/internal/relay/{key}")
async def relay(key: str, request: Request, c: Ctx = Depends(ctx)) -> Response:
    """FFmpeg's way in to chunked upstream files. Local callers only; Caddy does not route here."""
    if not request.client or request.client.host not in ("127.0.0.1", "::1"):
        raise ApiError("not_found", "Not found.")
    r = await get_json(c.redis, f"relay:{key}")
    if r is None:
        raise ApiError("not_found", "Not found.")
    return await passthrough(c, r["src"], c.proxy(r["session"]), request.headers.get("range"), {}, None)


# ---- app ---------------------------------------------------------------------------------


def create_app(settings: Settings | None = None, extractor: Extractor | None = None) -> FastAPI:
    settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        redis = Redis.from_url(settings.redis_url, decode_responses=True)
        db = await Database.connect(settings.database_url)
        app.state.ctx = Ctx(settings, redis, db, extractor or YtDlpExtractor())
        task = jobs.start(app.state.ctx) if settings.jobs_enabled else None
        try:
            yield
        finally:
            if task:
                task.cancel()
                with contextlib.suppress(BaseException):
                    await task
            await db.close()
            await redis.aclose()

    app = FastAPI(title="Naqi API", version="0.1.0", lifespan=lifespan, docs_url="/v1/docs", openapi_url="/v1/openapi.json")
    app.add_exception_handler(ApiError, api_error_handler)
    app.add_exception_handler(RequestValidationError, validation_handler)
    app.include_router(v1)
    app.include_router(admin)
    app.include_router(ops)
    app.add_middleware(VisitorMiddleware, secret=settings.secret_key, secure=settings.cookie_secure, domain=settings.cookie_domain)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.web_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
        expose_headers=["X-Size-Estimate", "Content-Disposition"],
        max_age=600,
    )
    return app
