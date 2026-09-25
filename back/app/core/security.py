import base64
import hashlib
import hmac
import secrets
import time

from app.core.config import settings

# scrypt parameters (n=2**14, r=8, p=1): the standard interactive-login setting.
_N, _R, _P = 2**14, 8, 1


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=_N, r=_R, p=_P)
    return f"scrypt${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    _, salt, digest = stored.split("$")
    candidate = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), n=_N, r=_R, p=_P)
    return hmac.compare_digest(candidate.hex(), digest)


def _sign(payload: str) -> str:
    mac = hmac.new(settings.SECRET_KEY.encode(), payload.encode(), hashlib.sha256).digest()
    return base64.urlsafe_b64encode(mac).decode().rstrip("=")


# Stateless token "<user_id>.<expires_at>.<signature>": no sessions table, logout = drop it on the client.
def create_token(user_id: int) -> str:
    payload = f"{user_id}.{int(time.time()) + settings.TOKEN_TTL_DAYS * 86400}"
    return f"{payload}.{_sign(payload)}"


def read_token(token: str) -> int | None:
    """User id if the token is authentic and not expired, else None."""
    try:
        user_id, expires_at, signature = token.split(".")
        if not hmac.compare_digest(signature, _sign(f"{user_id}.{expires_at}")):
            return None
        if int(expires_at) < time.time():
            return None
        return int(user_id)
    except ValueError:
        return None
