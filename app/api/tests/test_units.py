import pytest

from app.errors import ApiError
from app.extractor import build_media, classify_error, is_bot_block
from app.platforms import DEFAULTS, detect_platform, is_playlist, media_key_from_url, normalize, parse_url
from app.streaming import content_disposition, parse_range, safe_title


def fmt(**kw):
    return {"url": "https://cdn.example/x", "protocol": "https", **kw}


def test_portrait_short_is_labelled_by_short_side():
    info = {"id": "abc", "title": "t", "duration": 30, "formats": [
        fmt(width=1080, height=1920, vcodec="avc1", acodec="none", ext="mp4", tbr=3000),
        fmt(vcodec="none", acodec="mp4a.40.2", ext="m4a", abr=128),
    ]}
    media, streams = build_media(info, DEFAULTS["youtube"], 10800, 14400)
    assert media["formats"][0]["format_id"] == "v1080"
    assert streams["v1080"]["mode"] == "ffmpeg" and streams["v1080"]["audio"]


def test_prefers_avc_over_vp9_and_caps_height():
    info = {"id": "abc", "title": "t", "duration": 30, "formats": [
        fmt(width=3840, height=2160, vcodec="vp9", acodec="none", ext="webm", tbr=9000, url="https://cdn/4k"),
        fmt(width=7680, height=4320, vcodec="av01", acodec="none", ext="mp4", tbr=20000, url="https://cdn/8k"),
        fmt(width=1920, height=1080, vcodec="vp9", acodec="none", ext="webm", tbr=2000, url="https://cdn/vp9"),
        fmt(width=1920, height=1080, vcodec="avc1.640028", acodec="none", ext="mp4", tbr=2500, url="https://cdn/avc"),
        fmt(vcodec="none", acodec="opus", ext="webm", abr=160, url="https://cdn/opus"),
        fmt(vcodec="none", acodec="mp4a.40.2", ext="m4a", abr=128, url="https://cdn/aac"),
    ]}
    media, streams = build_media(info, DEFAULTS["youtube"], 10800, 14400)
    assert [f["format_id"] for f in media["formats"] if f["kind"] == "video"] == ["v2160", "v1080"]
    assert streams["v1080"]["video"]["url"] == "https://cdn/avc"
    assert streams["v1080"]["audio"]["url"] == "https://cdn/aac"


def test_x_has_no_audio_tab_and_progressive_is_direct():
    info = {"id": "1", "title": "t", "duration": 12, "formats": [
        fmt(width=1280, height=720, ext="mp4", vcodec=None, acodec=None, tbr=2000),
        fmt(width=640, height=360, ext="mp4", vcodec=None, acodec=None, tbr=800, protocol="m3u8_native"),
    ]}
    media, streams = build_media(info, DEFAULTS["x"], 10800, 14400)
    assert not media["audio_supported"]
    assert [f["format_id"] for f in media["formats"]] == ["v720", "v360"]
    assert streams["v720"]["mode"] == "direct" and streams["v360"]["mode"] == "ffmpeg"


def test_long_video_keeps_audio_only():
    info = {"id": "a", "title": "t", "duration": 3.5 * 3600, "formats": [
        fmt(width=1280, height=720, vcodec="avc1", acodec="mp4a", ext="mp4"),
    ]}
    media, _ = build_media(info, DEFAULTS["youtube"], 3 * 3600, 4 * 3600)
    assert {f["kind"] for f in media["formats"]} == {"audio"}


def test_live_and_playlist_refused():
    with pytest.raises(ApiError) as e:
        build_media({"live_status": "is_upcoming", "formats": []}, DEFAULTS["youtube"], 1, 1)
    assert e.value.code == "live_stream"


@pytest.mark.parametrize("msg,code", [
    ("ERROR: [youtube] x: Private video. Sign in if you've been granted access", "private_video"),
    ("ERROR: [youtube] x: Sign in to confirm your age. This video may be inappropriate", "age_restricted"),
    ("ERROR: [youtube] x: Sign in to confirm you're not a bot", "platform_down"),
    ("ERROR: [youtube] x: Video unavailable. This video has been removed by the uploader", "removed_video"),
    ("ERROR: [youtube] x: This live event will begin in 3 hours.", "live_stream"),
    ("ERROR: [youtube] x: The uploader has not made this video available in your country", "geo_blocked"),
    ("ERROR: [Instagram] C1: Requested content is not available, rate-limit reached or login required", "platform_down"),
    ("something odd", "platform_down"),
])
def test_classify_error(msg, code):
    assert classify_error(msg) == code


def test_urls():
    assert parse_url("youtu.be/dQw4w9WgXcQ") == "https://youtu.be/dQw4w9WgXcQ"
    assert parse_url("https://user:pw@youtube.com/") is None
    assert parse_url("two words") is None
    assert detect_platform("https://m.youtube.com/watch?v=x") == "youtube"
    assert detect_platform("https://evilyoutube.com/") is None
    assert detect_platform("https://clips.twitch.tv/abc") == "twitch"
    assert normalize("https://www.youtube.com/watch?v=abc&si=zz&utm_source=x#t") == "https://youtube.com/watch?v=abc"
    assert is_playlist("https://www.youtube.com/playlist?list=PL1")
    assert not is_playlist("https://www.youtube.com/watch?v=abc&list=PL1")
    assert media_key_from_url("https://youtube.com/shorts/dQw4w9WgXcQ") == "dQw4w9WgXcQ"
    assert media_key_from_url("https://x.com/a/status/1234567890") == "1234567890"


def test_instagram_links():
    assert detect_platform("https://www.instagram.com/reel/C1a2B3c4D5e/?igsh=abc") == "instagram"
    assert detect_platform(parse_url("instagr.am/p/C1a2B3c4D5e")) == "instagram"
    assert detect_platform("https://notinstagram.com/reel/x") is None
    assert normalize("https://www.instagram.com/reel/C1a2B3c4D5e/?igsh=zz") == "https://instagram.com/reel/C1a2B3c4D5e"
    assert media_key_from_url("https://www.instagram.com/reels/C1a2B3c4D5e/") == "C1a2B3c4D5e"
    assert media_key_from_url("https://www.instagram.com/p/C1a2B3c4D5e/") == "C1a2B3c4D5e"
    assert DEFAULTS["instagram"].use_proxy
    blocked = ApiError("platform_down", "[Instagram] C1: Requested content is not available, rate-limit reached or login required")
    assert is_bot_block(blocked)


def test_filenames():
    assert safe_title('a/b:c*"d"') == "a b c d"
    assert safe_title("   ") == "video"
    cd = content_disposition("سوق قديم (720p).mp4")
    assert cd.startswith('attachment; filename="') and "filename*=UTF-8''%D8%B3" in cd
    assert parse_range("bytes=10-") == (10, None)
    assert parse_range("bytes=10-5") is None
    assert parse_range("bytes=-500") is None
