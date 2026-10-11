import pytest
from src.sdk.crypto import encrypt_token, decrypt_token


def test_fernet_token_encryption_roundtrip():
    """Verify that sensitive access tokens are encrypted and decrypted correctly."""
    sample_token = "shpat_live_shopify_access_token_999888777"
    encrypted = encrypt_token(sample_token)

    # Must NOT be plain text
    assert encrypted != sample_token
    assert len(encrypted) > len(sample_token)
    assert not encrypted.startswith("shpat_")

    # Decryption must restore exact plaintext
    decrypted = decrypt_token(encrypted)
    assert decrypted == sample_token


def test_encryption_empty_token():
    """Empty tokens should return empty string cleanly without crashing."""
    assert encrypt_token("") == ""
    assert decrypt_token("") == ""


def test_legacy_plaintext_token_graceful_fallback():
    """If legacy plaintext token is retrieved, decrypt_token returns it safely without crashing."""
    legacy_token = "shpat_legacy_plain_token_123"
    result = decrypt_token(legacy_token)
    assert result == legacy_token
