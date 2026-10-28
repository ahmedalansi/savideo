from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Every knob from architecture.md, read from the environment (see .env.example)."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    secret_key: str
    public_api_base: str = "http://localhost:8000/v1"
    web_origins: list[str] = ["http://localhost:3000"]
    redis_url: str = "redis://localhost:6379/0"
    database_url: str | None = None
    admin_token: str | None = None

    cookie_secure: bool = False
    cookie_domain: str | None = None

    quota_limit: int = 3
    quota_ip_limit: int = 15
    max_duration_s: int = 3 * 3600
    max_audio_duration_s: int = 4 * 3600
    max_bytes: int = 4_000_000_000
    media_cache_s: int = 600
    token_ttl_s: int = 900

    # 0 means two FFmpeg processes per CPU core.
    ffmpeg_slots: int = 0
    # Residential proxy URL with a {session} placeholder for sticky sessions,
    # e.g. http://user-session-{session}:pass@gate.example:7000
    proxy_url: str | None = None
    # Where FFmpeg reaches this service for chunked relays of upstream files.
    internal_base: str = "http://127.0.0.1:8000"

    resolve_per_min: int = 20
    playlist_per_min: int = 5
    takedowns_per_hour: int = 3
    playlist_max_items: int = 20

    turnstile_secret: str | None = None
    resend_api_key: str | None = None
    notify_email: str | None = None
    notify_from: str | None = None

    # {"youtube": "https://...", ...}: one known public test video per platform.
    canary_urls: dict[str, str] = {}
    canary_interval_s: int = 900
    jobs_enabled: bool = True


@lru_cache
def get_settings() -> Settings:
    return Settings()
