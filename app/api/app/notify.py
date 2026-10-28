"""Outbound calls that are optional: Turnstile captcha and Resend email."""

import logging

import httpx

from .config import Settings

log = logging.getLogger("naqi")


async def turnstile_ok(secret: str, token: str | None, ip: str | None) -> bool:
    if not token:
        return False
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            r = await http.post(
                "https://challenges.cloudflare.com/turnstile/v0/siteverify",
                data={"secret": secret, "response": token, **({"remoteip": ip} if ip else {})},
            )
        return bool(r.json().get("success"))
    except Exception:
        log.exception("turnstile check failed")
        return False


async def send_email(settings: Settings, subject: str, text: str) -> None:
    if not (settings.resend_api_key and settings.notify_email and settings.notify_from):
        log.info("email not configured, skipped: %s", subject)
        return
    try:
        async with httpx.AsyncClient(timeout=10) as http:
            r = await http.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {settings.resend_api_key}"},
                json={"from": settings.notify_from, "to": [settings.notify_email], "subject": subject, "text": text},
            )
            r.raise_for_status()
    except Exception:
        log.exception("email failed: %s", subject)


async def new_takedown(settings: Settings, takedown_id: str, url_count: int) -> None:
    # No claimant details in the email: they stay in the database.
    await send_email(
        settings,
        "New takedown request",
        f"Takedown request {takedown_id} with {url_count} link(s) is waiting.\n"
        f"Review it with GET /v1/admin/takedowns?status=new. Target: reply within 48 hours.",
    )


async def platform_paused(settings: Settings, platform: str, error: str) -> None:
    await send_email(settings, f"{platform} paused by canary", f"The canary failed 3 times in a row for {platform}.\nLast error: {error}")
