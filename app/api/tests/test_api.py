import json
import subprocess
import tempfile
import time

import httpx
import pytest
import redis as redis_sync

from conftest import ADMIN

YT = "https://www.youtube.com/watch?v=dQw4w9WgXcQ&si=tracking"


def probe(data: bytes) -> dict:
    # From a file: ffprobe needs to seek to see every fragment of a fragmented MP4.
    with tempfile.NamedTemporaryFile(suffix=".bin") as f:
        f.write(data)
        f.flush()
        out = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration,format_name:stream=codec_type,codec_name,height", "-of", "json", f.name],
            capture_output=True, check=True,
        )
    return json.loads(out.stdout)


def resolve(http, url=YT):
    r = http.post("/v1/media/resolve", json={"url": url})
    assert r.status_code == 200, r.text
    return r.json()


def ticket(http, media, format_id, kind="video", **trim):
    r = http.post("/v1/downloads", json={"media_id": media["media_id"], "format_id": format_id, "kind": kind, **trim})
    assert r.status_code == 200, r.text
    return r.json()


def fetch(http, t, **kw) -> httpx.Response:
    return http.get("/v1" + t["download_url"].split("/v1", 1)[1], **kw)


# ---- resolve ------------------------------------------------------------------------


def test_health(http):
    body = http.get("/health").json()
    assert body["ok"] and body["redis"] and body["db"]


@pytest.mark.parametrize(
    "url,code",
    [("not a link", "invalid_url"), ("https://vimeo.com/123", "unsupported_site"), ("http://127.0.0.1:6379/", "invalid_url"), ("http://169.254.169.254/latest", "unsupported_site"),
     ("https://www.youtube.com/watch?v=PRIVATEVIDx", "private_video"), ("https://www.youtube.com/watch?v=LIVEVIDEOxx", "live_stream"),
     ("https://www.youtube.com/watch?v=LONGVIDEOxx", "too_long")],
)
def test_resolve_errors(http, url, code):
    r = http.post("/v1/media/resolve", json={"url": url})
    assert r.status_code >= 400
    assert r.json()["error"]["code"] == code


def test_resolve_lists_formats_and_sets_cookie(http, api):
    m = resolve(http)
    assert m["platform"] == "youtube" and m["duration_s"] == 10
    ids = [f["format_id"] for f in m["formats"]]
    assert ids == ["v1080", "v720", "a192", "a128"]
    by = {f["format_id"]: f for f in m["formats"]}
    assert by["v1080"]["needs_merge"] and not by["v720"]["needs_merge"]
    assert by["a192"]["abr_kbps"] == 192 and m["audio_supported"]
    assert m["thumbnail_url"].startswith(api["settings"].public_api_base + "/thumbnail?")
    assert "sv_vid" in http.cookies
    # Same video through another link shape hits the cache, not the extractor.
    calls = api["extractor"].calls
    resolve(http, "youtube.com/watch?v=dQw4w9WgXcQ&feature=share")
    assert api["extractor"].calls == calls


def test_thumbnail_rejects_unsigned(http):
    r = http.get("/v1/thumbnail", params={"u": "http://169.254.169.254/latest", "s": "0" * 32})
    assert r.status_code == 404


def test_resolve_rate_limit(http, api):
    for _ in range(api["settings"].resolve_per_min):
        resolve(http)
    r = http.post("/v1/media/resolve", json={"url": YT})
    assert r.status_code == 429 and r.json()["error"]["code"] == "rate_limited"


def test_playlist_first_20(http):
    r = http.post("/v1/playlists/resolve", json={"url": "https://www.youtube.com/playlist?list=PL123"})
    assert r.status_code == 200
    assert len(r.json()["items"]) == 20
    assert r.json()["items"][0]["url"] == "https://www.youtube.com/watch?v=PLITEM00000"


# ---- downloads ---------------------------------------------------------------------------


def test_direct_download_passes_bytes_and_ranges(http, api):
    m = resolve(http)
    t = ticket(http, m, "v720")
    original = (api["media"] / "prog720.mp4").read_bytes()
    r = fetch(http, t)
    assert r.status_code == 200
    assert r.content == original  # fetched upstream in 200 KB chunks, stitched back
    assert r.headers["content-length"] == str(len(original))
    assert "filename*=UTF-8''" in r.headers["content-disposition"]
    assert "%D8%B1%D8%AD%D9%84%D8%A9" in r.headers["content-disposition"]  # Arabic title kept
    part = fetch(http, t, headers={"Range": "bytes=1000-450000"})
    assert part.status_code == 206
    assert part.content == original[1000:450001]
    assert part.headers["content-range"] == f"bytes 1000-450000/{len(original)}"


def test_merge_1080_has_video_and_audio(http):
    m = resolve(http)
    r = fetch(http, ticket(http, m, "v1080"))
    assert r.status_code == 200 and r.headers["content-type"] == "video/mp4"
    info = probe(r.content)
    kinds = {s["codec_type"]: s for s in info["streams"]}
    assert kinds["video"]["height"] == 1080 and kinds["audio"]["codec_name"] == "aac"
    assert 9 <= float(info["format"]["duration"]) <= 10.5


def test_trim_cuts_clip(http):
    m = resolve(http)
    t = ticket(http, m, "v1080", trim_start_s=2, trim_end_s=6)
    assert t["size_estimate"] is not None
    info = probe(fetch(http, t).content)
    assert 3.5 <= float(info["format"]["duration"]) <= 5.2  # stream copy cuts on keyframes


def test_trim_validation(http):
    m = resolve(http)
    for trim in ({"trim_start_s": 5, "trim_end_s": 5.5}, {"trim_start_s": 2, "trim_end_s": 60}):
        r = http.post("/v1/downloads", json={"media_id": m["media_id"], "format_id": "v720", "kind": "video", **trim})
        assert r.status_code == 400 and r.json()["error"]["code"] == "invalid_request"


def test_mp3(http):
    m = resolve(http)
    r = fetch(http, ticket(http, m, "a192", kind="audio"))
    assert r.headers["content-type"] == "audio/mpeg"
    assert r.headers["content-disposition"].count(".mp3") == 2
    info = probe(r.content)
    assert info["streams"][0]["codec_name"] == "mp3"


def test_unknown_format_and_expired(http):
    m = resolve(http)
    r = http.post("/v1/downloads", json={"media_id": m["media_id"], "format_id": "v4320", "kind": "video"})
    assert r.json()["error"]["code"] == "invalid_request"
    r = http.post("/v1/downloads", json={"media_id": "m_" + "0" * 20, "format_id": "v720", "kind": "video"})
    assert r.status_code == 410 and r.json()["error"]["code"] == "link_expired"
    r = http.get("/v1/downloads/nope")
    assert r.status_code == 410


def test_disconnect_kills_ffmpeg_and_frees_slot(http, api, redis_url):
    m = resolve(http)
    t = ticket(http, m, "v1080")
    r = redis_sync.Redis.from_url(redis_url)
    with http.stream("GET", t["download_url"].split(api["base"])[1]) as resp:
        assert resp.status_code == 200
        next(resp.iter_bytes())
        assert int(r.get("sem:ffmpeg")) == 1
    for _ in range(50):
        if int(r.get("sem:ffmpeg") or 0) == 0:
            break
        time.sleep(0.1)
    assert int(r.get("sem:ffmpeg") or 0) == 0
    assert not list(r.scan_iter("relay:*"))


def test_busy_when_ffmpeg_full(http, redis_url):
    m = resolve(http)
    redis_sync.Redis.from_url(redis_url).set("sem:ffmpeg", 4)
    r = http.post("/v1/downloads", json={"media_id": m["media_id"], "format_id": "v1080", "kind": "video"})
    assert r.status_code == 503 and r.json()["error"]["code"] == "busy" and r.json()["error"]["retry_at"]
    # Direct downloads do not need FFmpeg, so they still work.
    ticket(http, m, "v720")
    assert http.get("/v1/quota").json()["used"] == 1


# ---- quota (F04) ---------------------------------------------------------------------------


def test_quota_three_per_hour(http):
    m = resolve(http)
    assert http.get("/v1/quota").json()["used"] == 0
    for n in (1, 2, 3):
        assert ticket(http, m, "v720")["quota"]["used"] == n
    r = http.post("/v1/downloads", json={"media_id": m["media_id"], "format_id": "v720", "kind": "video"})
    assert r.status_code == 429
    err = r.json()["error"]
    assert err["code"] == "quota_exceeded" and err["retry_at"] and err["quota"]["used"] == 3
    q = http.get("/v1/quota").json()
    assert q == {"used": 3, "limit": 3, "resets_at": err["retry_at"]}


def test_quota_is_per_browser_with_ip_ceiling(api):
    with httpx.Client(base_url=api["base"]) as first:
        m = resolve(first)
        for _ in range(3):
            ticket(first, m, "v720")
    # A fresh browser (new cookie) on the same IP gets its own 3...
    with httpx.Client(base_url=api["base"]) as second:
        assert second.get("/v1/quota").json()["used"] == 0
        ticket(second, m, "v720")
    # ...until the per-IP ceiling (15) stops cookie clearing.
    used = 4
    while used < api["settings"].quota_ip_limit:
        with httpx.Client(base_url=api["base"]) as c:
            ticket(c, m, "v720")
            used += 1
    with httpx.Client(base_url=api["base"]) as c:
        r = c.post("/v1/downloads", json={"media_id": m["media_id"], "format_id": "v720", "kind": "video"})
        assert r.json()["error"]["code"] == "quota_exceeded"


def test_cors_allows_web_origin_with_cookies(http):
    r = http.options("/v1/downloads", headers={"Origin": "http://localhost:3000", "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type"})
    assert r.headers["access-control-allow-origin"] == "http://localhost:3000"
    assert r.headers["access-control-allow-credentials"] == "true"
    r = http.options("/v1/downloads", headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "POST"})
    assert "access-control-allow-origin" not in r.headers


# ---- legal and admin --------------------------------------------------------------------------

TAKEDOWN = {
    "claimant_name": "Rights Holder",
    "claimant_email": "rights@example.com",
    "work_description": "My short film",
    "urls": ["https://youtu.be/BLOCKEDvid1"],
    "statement_good_faith": True,
    "statement_accuracy": True,
    "signature": "Rights Holder",
}


def test_takedown_accept_blocks_video(http, api):
    admin = {"Authorization": f"Bearer {ADMIN}"}
    assert http.get("/v1/admin/takedowns").status_code == 401
    assert http.get("/v1/admin/takedowns", headers={"Authorization": "Bearer wrong"}).status_code == 401

    assert http.post("/v1/takedowns", json=TAKEDOWN | {"statement_accuracy": False}).status_code == 400
    r = http.post("/v1/takedowns", json=TAKEDOWN)
    assert r.status_code == 201 and r.json()["status"] == "new"
    tid = r.json()["id"]

    # Resolvable before the decision.
    resolve(http, "https://www.youtube.com/watch?v=BLOCKEDvid1")
    listed = http.get("/v1/admin/takedowns", params={"status": "new"}, headers=admin).json()
    assert any(t["id"] == tid for t in listed)
    r = http.patch(f"/v1/admin/takedowns/{tid}", json={"status": "accepted", "admin_notes": "ok"}, headers=admin)
    assert r.status_code == 200 and r.json()["unmatched_urls"] == []

    # Any link shape for that video is now refused, even from the cache.
    for url in ("https://www.youtube.com/watch?v=BLOCKEDvid1", "https://youtube.com/shorts/BLOCKEDvid1"):
        r = http.post("/v1/media/resolve", json={"url": url})
        assert r.status_code == 451 and r.json()["error"]["code"] == "blocked"


def test_channel_block_and_unblock(http):
    admin = {"Authorization": f"Bearer {ADMIN}"}
    m = resolve(http, "https://www.youtube.com/watch?v=CHANvideo01")
    r = http.post("/v1/admin/blocked", json={"platform_id": "youtube", "media_key": "UCchannelCHA", "scope": "channel", "reason": "test"}, headers=admin)
    assert r.status_code == 201
    r2 = http.post("/v1/downloads", json={"media_id": m["media_id"], "format_id": "v720", "kind": "video"})
    assert r2.json()["error"]["code"] == "blocked"
    assert http.delete(f"/v1/admin/blocked/{r.json()['id']}", headers=admin).status_code == 204
    ticket(http, m, "v720")


def test_platform_switch_off_and_stats(http):
    admin = {"Authorization": f"Bearer {ADMIN}"}
    r = http.patch("/v1/admin/platforms/reddit", json={"enabled": False}, headers=admin)
    assert r.status_code == 200 and r.json()["enabled"] is False
    r = http.post("/v1/media/resolve", json={"url": "https://www.reddit.com/r/videos/comments/abc123/x/"})
    assert r.json()["error"]["code"] == "platform_down"
    http.patch("/v1/admin/platforms/reddit", json={"enabled": True}, headers=admin)

    m = resolve(http)
    fetch(http, ticket(http, m, "v720"))
    time.sleep(0.3)
    stats = http.get("/v1/admin/stats", headers=admin).json()
    yt = next(p for p in stats["by_platform"] if p["platform_id"] == "youtube")
    assert yt["completed"] >= 1 and yt["bytes"] > 0


def test_kill_switch(http, redis_url):
    redis_sync.Redis.from_url(redis_url).set("kill:youtube", "admin")
    r = http.post("/v1/media/resolve", json={"url": YT})
    assert r.json()["error"]["code"] == "platform_down"


def test_relay_is_local_only_and_keyed(http):
    assert http.get("/internal/relay/unknown").status_code == 404


# ---- found by /replica-test (replica/bugs.md) -------------------------------------------------

BROKEN = "https://www.youtube.com/watch?v=BROKENSTRMx"
NAV = {"Sec-Fetch-Mode": "navigate", "Accept": "text/html,application/xhtml+xml,*/*;q=0.8"}


@pytest.mark.parametrize("fid", ["v720", "v1080"])
def test_bug001_failed_download_sends_the_browser_back_to_the_site(http, fid):
    t = ticket(http, resolve(http, BROKEN), fid)
    r = fetch(http, t, headers=NAV)
    assert r.status_code == 303
    assert r.headers["location"] == "http://localhost:3000/?download_error=platform_down"


def test_bug001_api_callers_still_get_json(http):
    r = fetch(http, ticket(http, resolve(http, BROKEN), "v720"))
    assert r.status_code == 502 and r.json()["error"]["code"] == "platform_down"
    r = http.get("/v1/downloads/nope", headers=NAV)
    assert r.status_code == 303 and r.headers["location"].endswith("download_error=link_expired")


def test_bug002_download_link_cannot_be_replayed(http):
    m = resolve(http)
    t = ticket(http, m, "v1080")
    assert fetch(http, t).status_code == 200
    assert fetch(http, t).status_code == 200  # one retry, e.g. the browser restarting a failed download
    r = fetch(http, t)
    assert r.status_code == 410 and r.json()["error"]["code"] == "link_expired"
    # Direct files keep working for resumes, but not forever.
    t = ticket(http, m, "v720")
    codes = [fetch(http, t, headers={"Range": f"bytes={i}-{i + 9}"}).status_code for i in range(20)]
    assert set(codes) == {206}
    assert fetch(http, t).status_code == 410


def test_bug003_failed_download_gives_the_free_download_back(http):
    t = ticket(http, resolve(http, BROKEN), "v1080")
    assert http.get("/v1/quota").json()["used"] == 1
    fetch(http, t, headers=NAV)
    fetch(http, t, headers=NAV)  # refunded once, however often the link is retried
    assert http.get("/v1/quota").json()["used"] == 0


def test_bug004_overlong_link_is_an_invalid_link(http):
    r = http.post("/v1/media/resolve", json={"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ&x=" + "a" * 3000})
    assert r.status_code == 400 and r.json()["error"]["code"] == "invalid_url"
