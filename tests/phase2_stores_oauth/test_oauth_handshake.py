import pytest
from src.sdk.oauth.tokens import TokenManager


def test_token_manager_encryption_for_store_tokens():
    """Verify that TokenManager encrypts and decrypts OAuth tokens securely."""
    tm = TokenManager()
    plain_token = "shpat_live_oauth_access_token_super_secret"

    encrypted = tm.encrypt(plain_token)
    assert encrypted != plain_token
    assert len(encrypted) > len(plain_token)

    decrypted = tm.decrypt(encrypted)
    assert decrypted == plain_token
