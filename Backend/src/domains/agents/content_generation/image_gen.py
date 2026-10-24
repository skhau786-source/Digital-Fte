# ═══════════════════════════════════════════════════════════════
# agents / content_generation / image_gen.py
#
# PURPOSE: Image generation via Gemini (google-genai SDK).
#          Raises ImageGenerationError on any failure — there is no
#          mock/placeholder fallback. The caller decides what to do.
#
# USED BY: handler.py (content generation pipeline)
# ═══════════════════════════════════════════════════════════════

import asyncio
import logging
from urllib.parse import quote
from abc import ABC, abstractmethod
from dataclasses import dataclass

logger = logging.getLogger(__name__)


class ImageGenerationError(Exception):
    """Image could not be generated. str(e) is safe to show to users."""


@dataclass
class GeneratedImage:
    data: bytes
    mime_type: str
    model: str
    prompt_used: str


class ImageGenerator(ABC):
    @abstractmethod
    async def generate(self, prompt: str) -> GeneratedImage:
        """Generate one image from a prompt or raise ImageGenerationError."""


class GeminiImageGenerator(ImageGenerator):
    """Gemini image models (e.g. gemini-2.5-flash-image) via google-genai."""

    def __init__(self, api_key: str, model: str, aspect_ratio: str = "1:1", timeout_seconds: int = 60):
        self.api_key = api_key
        self.model = model
        self.aspect_ratio = aspect_ratio
        self.timeout_seconds = timeout_seconds

    async def generate(self, prompt: str) -> GeneratedImage:
        if not self.api_key:
            raise ImageGenerationError("GEMINI_API_KEY is not configured")
        if not self.model:
            raise ImageGenerationError("IMAGE_MODEL is not configured")

        from google import genai
        from google.genai import errors, types

        client = genai.Client(
            api_key=self.api_key,
            http_options=types.HttpOptions(timeout=self.timeout_seconds * 1000),
        )
        config = types.GenerateContentConfig(
            response_modalities=["IMAGE"],
            image_config=types.ImageConfig(aspect_ratio=self.aspect_ratio),
        )

        last_error = "unknown error"
        for attempt in (1, 2):  # one retry, only for transient failures
            try:
                # Sync client in a thread on purpose: the SDK's async client needs a newer
                # aiohttp than the one pinned in this environment (AttributeError on import
                # of aiohttp.ClientConnectorDNSError). Revisit when aiohttp is upgraded.
                response = await asyncio.to_thread(
                    client.models.generate_content,
                    model=self.model, contents=prompt, config=config,
                )
            except errors.APIError as e:
                code = getattr(e, "code", None)
                logger.error(f"Gemini image API error {code} (attempt {attempt}): {e.message}")
                if code == 429:
                    raise ImageGenerationError(
                        "Image provider quota exceeded (429). Check the Gemini plan/billing for this API key."
                    )
                if code in (400, 401, 403, 404):
                    raise ImageGenerationError(f"Image provider rejected the request ({code}): {e.message}")
                last_error = f"provider error {code}"
            except Exception as e:
                logger.error(f"Gemini image call failed (attempt {attempt}): {type(e).__name__}")
                last_error = type(e).__name__
            else:
                for cand in response.candidates or []:
                    for part in (cand.content.parts if cand.content else None) or []:
                        if part.inline_data and part.inline_data.data:
                            return GeneratedImage(
                                data=part.inline_data.data,
                                mime_type=part.inline_data.mime_type or "image/png",
                                model=self.model,
                                prompt_used=prompt,
                            )
                feedback = response.prompt_feedback
                reason = getattr(feedback, "block_reason", None) if feedback else None
                suffix = f" (blocked: {reason})" if reason else ""
                raise ImageGenerationError(f"Image provider returned no image{suffix}")
            if attempt == 1:
                await asyncio.sleep(2)
        raise ImageGenerationError(f"Image generation failed after retry: {last_error}")


class PollinationsImageGenerator(ImageGenerator):
    """DEV TESTING ONLY: free, keyless image.pollinations.ai. Not for production use."""

    BASE_URL = "https://image.pollinations.ai/prompt/"
    MODEL = "pollinations-flux"

    def __init__(self, timeout_seconds: int = 60):
        self.timeout_seconds = timeout_seconds

    async def generate(self, prompt: str) -> GeneratedImage:
        import httpx

        url = f"{self.BASE_URL}{quote(prompt[:800], safe='')}"
        params = {"width": 1024, "height": 1024, "nologo": "true", "model": "flux"}
        last_error = "unknown error"
        for attempt in (1, 2):  # one retry, only for transient failures
            try:
                async with httpx.AsyncClient(timeout=self.timeout_seconds, follow_redirects=True) as client:
                    resp = await client.get(url, params=params)
            except httpx.HTTPError as e:
                logger.error(f"Pollinations call failed (attempt {attempt}): {type(e).__name__}")
                last_error = type(e).__name__
            else:
                mime = resp.headers.get("content-type", "").split(";")[0].strip().lower()
                if resp.status_code == 200 and mime in ("image/png", "image/jpeg", "image/webp"):
                    return GeneratedImage(data=resp.content, mime_type=mime,
                                          model=self.MODEL, prompt_used=prompt)
                logger.error(f"Pollinations returned {resp.status_code} {mime} (attempt {attempt})")
                if resp.status_code in (400, 401, 403, 404):
                    raise ImageGenerationError(f"Image provider rejected the request ({resp.status_code})")
                last_error = f"provider error {resp.status_code}"
            if attempt == 1:
                await asyncio.sleep(2)
        raise ImageGenerationError(f"Image generation failed after retry: {last_error}")


def create_image_generator(api_key: str, model: str, aspect_ratio: str = "1:1",
                           timeout_seconds: int = 60, provider: str = "gemini",
                           environment: str = "development") -> ImageGenerator:
    if provider == "pollinations":
        if environment == "production":
            raise ImageGenerationError("IMAGE_PROVIDER=pollinations is dev-only and not allowed in production")
        logger.warning("Using the pollinations image provider (DEV TESTING ONLY)")
        return PollinationsImageGenerator(timeout_seconds)
    if provider != "gemini":
        raise ImageGenerationError(f"Unknown IMAGE_PROVIDER: {provider}")
    return GeminiImageGenerator(api_key, model, aspect_ratio, timeout_seconds)
