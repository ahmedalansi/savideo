"""Anonymous visitor id in a signed, httpOnly cookie. No accounts in the MVP."""

import hashlib
import hmac
import secrets
from http.cookies import SimpleCookie

COOKIE = "sv_vid"
MAX_AGE = 365 * 24 * 3600


def _sign(secret: str, vid: str) -> str:
    return hmac.new(secret.encode(), vid.encode(), hashlib.sha256).hexdigest()[:24]


def read_visitor(secret: str, cookie_header: str) -> str | None:
    jar = SimpleCookie()
    try:
        jar.load(cookie_header)
    except Exception:
        return None
    raw = jar.get(COOKIE)
    if not raw or "." not in raw.value:
        return None
    vid, sig = raw.value.rsplit(".", 1)
    return vid if hmac.compare_digest(sig, _sign(secret, vid)) else None


class VisitorMiddleware:
    """Puts the visitor id on request.state.visitor and sets the cookie when it is new."""

    def __init__(self, app, secret: str, secure: bool, domain: str | None):
        self.app, self.secret, self.secure, self.domain = app, secret, secure, domain

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        headers = dict((k.decode().lower(), v.decode("latin-1")) for k, v in scope["headers"])
        vid = read_visitor(self.secret, headers.get("cookie", ""))
        new = vid is None
        if new:
            vid = secrets.token_urlsafe(16)
        scope.setdefault("state", {})["visitor"] = vid

        async def send_with_cookie(message):
            if new and message["type"] == "http.response.start":
                parts = [f"{COOKIE}={vid}.{_sign(self.secret, vid)}", "Path=/", f"Max-Age={MAX_AGE}", "HttpOnly", "SameSite=Lax"]
                if self.secure:
                    parts.append("Secure")
                if self.domain:
                    parts.append(f"Domain={self.domain}")
                message["headers"] = [*message.get("headers", []), (b"set-cookie", "; ".join(parts).encode())]
            await send(message)

        await self.app(scope, receive, send_with_cookie)
