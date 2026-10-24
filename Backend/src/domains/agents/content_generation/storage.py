# ═══════════════════════════════════════════════════════════════
# agents / content_generation / storage.py
#
# PURPOSE: Storage interface for generated images (save/get/delete).
#          Local-disk implementation now; swap in S3/Cloudinary later
#          by implementing ImageStorage — generator code is unaffected.
#
# USED BY: handler.py, api.py
# ═══════════════════════════════════════════════════════════════

import asyncio
import re
import uuid
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional

_KEY_RE = re.compile(r"^[a-f0-9]{32}\.(png|jpg|webp)$")
_EXT = {"image/png": "png", "image/jpeg": "jpg", "image/webp": "webp"}
_MIME = {v: k for k, v in _EXT.items()}


class ImageStorage(ABC):
    @abstractmethod
    async def save(self, data: bytes, mime_type: str) -> str:
        """Persist image bytes. Returns the public URL to store in the DB."""

    @abstractmethod
    async def get(self, key: str) -> Optional[tuple[bytes, str]]:
        """Return (bytes, mime_type) for a storage key, or None if missing."""

    @abstractmethod
    async def delete(self, url_or_key: str) -> None:
        """Delete an image by key or by the URL returned from save()."""


class LocalImageStorage(ImageStorage):
    """Writes files under a local directory; served through
    GET /api/v1/content/images/{key}. File names are random UUIDs."""

    URL_PREFIX = "/api/v1/content/images/"

    def __init__(self, directory: str):
        path = Path(directory)
        if not path.is_absolute():
            path = Path(__file__).resolve().parents[4] / path  # Backend/
        self.dir = path

    @staticmethod
    def key_from_url(url_or_key: str) -> str:
        return url_or_key.rsplit("/", 1)[-1]

    async def save(self, data: bytes, mime_type: str) -> str:
        ext = _EXT.get(mime_type)
        if not ext:
            raise ValueError(f"Unsupported image type: {mime_type}")
        key = f"{uuid.uuid4().hex}.{ext}"

        def _write():
            self.dir.mkdir(parents=True, exist_ok=True)
            (self.dir / key).write_bytes(data)

        await asyncio.to_thread(_write)
        return f"{self.URL_PREFIX}{key}"

    async def get(self, key: str) -> Optional[tuple[bytes, str]]:
        if not _KEY_RE.match(key):  # blocks path traversal
            return None
        path = self.dir / key
        if not path.is_file():
            return None
        data = await asyncio.to_thread(path.read_bytes)
        return data, _MIME[key.rsplit(".", 1)[1]]

    async def delete(self, url_or_key: str) -> None:
        key = self.key_from_url(url_or_key)
        if _KEY_RE.match(key):
            (self.dir / key).unlink(missing_ok=True)


def get_image_storage() -> ImageStorage:
    from src.domains.agents.content_generation.config import get_settings
    return LocalImageStorage(get_settings().IMAGE_STORAGE_DIR)
