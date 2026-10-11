# ═══════════════════════════════════════════════════════════════
# fte_sdk / crypto.py
#
# PURPOSE: Encrypt/decrypt sensitive tokens (Shopify access tokens)
#          at rest using Fernet symmetric encryption.
#
# USED BY: backend api.py (encrypt on save), agent handler (decrypt on read)
# ═══════════════════════════════════════════════════════════════

import os
import logging
from typing import Optional
from cryptography.fernet import Fernet

logger = logging.getLogger(__name__)

# ─── Key helpers ──────────────────────────────────────────────

def _derive_key(raw_key: str) -> bytes:
    """Convert any string key to a valid 32-byte Fernet key.
    Uses SHA-256 hash so any length key works."""
    import base64, hashlib
    digest = hashlib.sha256(raw_key.encode()).digest()
    return base64.urlsafe_b64encode(digest)


def _get_fernet_key(key: Optional[str] = None) -> bytes:
    """Retrieve key from argument, ENCRYPTION_KEY, or SECRET_KEY env variable."""
    effective_key = key or os.getenv("ENCRYPTION_KEY") or os.getenv("SECRET_KEY") or "autofte-secure-default-encryption-key-32chars"
    return _derive_key(effective_key)


# ─── encrypt_token ────────────────────────────────────────────

def encrypt_token(plaintext: str, key: Optional[str] = None) -> str:
    """Encrypt token with Fernet symmetric cipher."""
    if not plaintext:
        return ""
    try:
        derived_key = _get_fernet_key(key)
        f = Fernet(derived_key)
        return f.encrypt(plaintext.encode()).decode()
    except Exception as e:
        logger.error(f"Token encryption failed: {e}")
        raise ValueError(f"Crypto error: Unable to securely encrypt token: {e}")


# ─── decrypt_token ────────────────────────────────────────────

def decrypt_token(ciphertext: str, key: Optional[str] = None) -> str:
    """Decrypt Fernet-encrypted token.
    Falls back gracefully if token was stored in plain text."""
    if not ciphertext:
        return ""
    try:
        derived_key = _get_fernet_key(key)
        f = Fernet(derived_key)
        return f.decrypt(ciphertext.encode()).decode()
    except Exception:
        # Backward compatibility fallback if token was plain text
        return ciphertext
