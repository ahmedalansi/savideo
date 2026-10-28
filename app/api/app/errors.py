from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

# HTTP status for each error code the web app knows (web/lib/types.ts ErrorCode).
STATUS = {
    "invalid_url": 400,
    "invalid_request": 400,
    "unsupported_site": 400,
    "private_video": 422,
    "removed_video": 422,
    "age_restricted": 422,
    "live_stream": 422,
    "geo_blocked": 422,
    "too_long": 422,
    "too_large": 422,
    "blocked": 451,
    "link_expired": 410,
    "quota_exceeded": 429,
    "rate_limited": 429,
    "busy": 503,
    "platform_down": 502,
    "unauthorized": 401,
    "not_found": 404,
    "not_configured": 503,
}


class ApiError(Exception):
    def __init__(self, code: str, message: str | None = None, retry_at: str | None = None, quota: dict | None = None):
        super().__init__(code)
        self.code = code
        self.message = message or code
        self.retry_at = retry_at
        self.quota = quota


def error_body(err: ApiError) -> dict:
    body = {"code": err.code, "message": err.message, "retry_at": err.retry_at}
    if err.quota is not None:
        body["quota"] = err.quota
    return {"error": body}


async def api_error_handler(_: Request, err: ApiError) -> JSONResponse:
    headers = {"Cache-Control": "no-store"}
    if err.code == "busy":
        headers["Retry-After"] = "5"
    return JSONResponse(error_body(err), status_code=STATUS.get(err.code, 400), headers=headers)


async def validation_handler(_: Request, err: RequestValidationError) -> JSONResponse:
    first = err.errors()[0] if err.errors() else {}
    where = ".".join(str(p) for p in first.get("loc", [])[1:])
    msg = f"{where}: {first.get('msg', 'invalid')}" if where else "invalid request"
    return JSONResponse(error_body(ApiError("invalid_request", msg)), status_code=400)
