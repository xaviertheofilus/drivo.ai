"""Agora RTC token generation (server-side)."""
import os
import time

from agora_token_builder import RtcTokenBuilder

AGORA_APP_ID = os.environ.get("AGORA_APP_ID")
AGORA_APP_CERTIFICATE = os.environ.get("AGORA_APP_CERTIFICATE")

# Role 1 = publisher (driver + AI), Role 2 = subscriber-only.
ROLE_PUBLISHER = 1


def build_rtc_token(channel_name: str, uid: int, expire_seconds: int = 3600) -> dict:
    if not (AGORA_APP_ID and AGORA_APP_CERTIFICATE):
        raise RuntimeError("Agora credentials not configured")
    privilege_ts = int(time.time()) + expire_seconds
    token = RtcTokenBuilder.buildTokenWithUid(
        AGORA_APP_ID, AGORA_APP_CERTIFICATE, channel_name, uid, ROLE_PUBLISHER, privilege_ts
    )
    return {
        "app_id": AGORA_APP_ID,
        "channel": channel_name,
        "token": token,
        "uid": uid,
        "expires_at": privilege_ts,
    }
