# ═══════════════════════════════════════════════════════════════
# agents / content_generation / api.py
#
# PURPOSE: REST API endpoints for Content Generation Agent.
#          Also registered as routes in the central Backend API.
#
# USED BY: main.py, backend/api.py
# ═══════════════════════════════════════════════════════════════

import logging
from typing import Optional

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from src.sdk.database import get_db
from src.sdk.models.content import GeneratedPost, BrandVoiceProfile, ImageAsset, ImageGenerationUsage
from src.sdk.event_bus import RedisEventBus

from src.dependencies import get_event_bus

from src.domains.agents.content_generation.config import get_settings
from src.domains.agents.content_generation.schemas import (
    GenerateRequest, PostActionRequest, GenerateResponse,
    BrandVoiceCreate, BrandVoiceUpdate, BrandVoiceOut,
)
from src.domains.agents.content_generation.handler import ContentGenerationHandler
from src.domains.agents.content_generation.storage import get_image_storage
from src.domains.auth.service import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/content", tags=["Content Generation"])


# ─── Daily image-generation limit ─────────────────────────────

async def _reserve_image_generation(db: AsyncSession, user_id: int, post_id: Optional[int] = None) -> None:
    """Enforce IMAGE_DAILY_LIMIT per user per UTC day (429 when exceeded) and record the attempt."""
    limit = get_settings().IMAGE_DAILY_LIMIT
    day_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    used = (await db.execute(
        select(func.count(ImageGenerationUsage.id)).where(
            ImageGenerationUsage.user_id == user_id,
            ImageGenerationUsage.created_at >= day_start,
        )
    )).scalar_one()
    if used >= limit:
        raise HTTPException(
            status_code=429,
            detail=f"Daily image generation limit reached ({limit} per day). Try again tomorrow (resets 00:00 UTC).",
        )
    db.add(ImageGenerationUsage(user_id=user_id, post_id=post_id))
    await db.commit()


# ─── Generate Post ────────────────────────────────────────────

@router.post("/generate", response_model=GenerateResponse)
async def generate_post(
    body: GenerateRequest,
    db: AsyncSession = Depends(get_db),
    bus=Depends(get_event_bus),
    current_user=Depends(get_current_user),
):
    """Generate a social media post for a product using AI (LLM council + image gen)."""
    await _reserve_image_generation(db, current_user.id)
    handler = ContentGenerationHandler(db=db, event_bus=bus)
    try:
        post = await handler.generate_post(
            product_id=body.product_id,
            brand_voice_id=body.brand_voice_id,
            platform=body.platform,
            image_style=body.image_style,
            auto_approve=body.auto_approve,
        )
        img_result = await db.execute(
            select(ImageAsset).where(ImageAsset.post_id == post.id)
        )
        images = img_result.scalars().all()
        image_url = images[0].url if images else ""
        return GenerateResponse(
            message="Content generated successfully",
            post_id=post.id,
            status=post.status,
            caption=post.caption,
            image_url=image_url,
            image_status=post.image_status or "none",
            image_error=post.image_error or "",
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Generate failed: {e}")
        raise HTTPException(status_code=500, detail="Content generation failed")


# ─── List / Get Posts ─────────────────────────────────────────

@router.get("/history")
async def list_posts(
    status: Optional[str] = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """List generated posts with optional status filter."""
    query = (
        select(GeneratedPost)
        .options(selectinload(GeneratedPost.images))
        .order_by(GeneratedPost.created_at.desc())
    )
    if status:
        query = query.where(GeneratedPost.status == status)
    query = query.limit(limit)
    result = await db.execute(query)
    posts = result.scalars().all()
    return [
        {
            "id": p.id,
            "product_id": p.product_id,
            "platform": p.platform,
            "caption_preview": p.caption[:150] if p.caption else "",
            "status": p.status,
            "image_model_used": p.image_model_used,
            "image_status": p.image_status,
            "image_error": p.image_error,
            "created_at": p.created_at,
            "has_image": len(p.images) > 0,
        }
        for p in posts
    ]


@router.get("/posts/{post_id}")
async def get_post(post_id: int, db: AsyncSession = Depends(get_db), _auth=Depends(get_current_user)):
    """Get single generated post with images."""
    result = await db.execute(select(GeneratedPost).options(selectinload(GeneratedPost.images)).where(GeneratedPost.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return {
        "id": post.id,
        "product_id": post.product_id,
        "platform": post.platform,
        "caption": post.caption,
        "status": post.status,
        "review_notes": post.review_notes,
        "image_model_used": post.image_model_used,
        "image_status": post.image_status,
        "image_error": post.image_error,
        "created_at": post.created_at,
        "approved_at": post.approved_at,
        "images": [
            {"id": img.id, "url": img.url, "model_used": img.model_used, "status": img.status}
            for img in post.images
        ],
    }


# ─── Approve / Reject / Regenerate ────────────────────────────

@router.post("/posts/{post_id}/approve")
async def approve_post(
    post_id: int,
    body: PostActionRequest = PostActionRequest(),
    db: AsyncSession = Depends(get_db),
    bus=Depends(get_event_bus),
    current_user=Depends(get_current_user),
):
    """Approve a generated post → sends to scheduling agent."""
    handler = ContentGenerationHandler(db=db, event_bus=bus)
    try:
        post = await handler.approve_post(post_id, body.feedback)
        resp = {"message": "Post approved", "post_id": post.id, "status": post.status,
                "has_image": post.image_status == "generated"}
        if not resp["has_image"]:
            resp["warning"] = "Approved without an image"
        return resp
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/posts/{post_id}/reject")
async def reject_post(
    post_id: int,
    body: PostActionRequest = PostActionRequest(),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Reject a generated post with feedback."""
    handler = ContentGenerationHandler(db=db)
    try:
        post = await handler.reject_post(post_id, body.feedback)
        return {"message": "Post rejected", "post_id": post.id, "status": post.status}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/posts/{post_id}/regenerate")
async def regenerate_post(
    post_id: int,
    body: PostActionRequest = PostActionRequest(),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Regenerate a rejected post with feedback."""
    handler = ContentGenerationHandler(db=db)
    try:
        post = await handler.regenerate_post(post_id, body.feedback)
        return {"message": "Post regenerated", "post_id": post.id, "status": post.status}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/posts/{post_id}/regenerate-image")
async def regenerate_image(
    post_id: int,
    image_style: str = "",
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Retry/redo image generation for a post (counts toward the daily limit)."""
    await _reserve_image_generation(db, current_user.id, post_id)
    handler = ContentGenerationHandler(db=db)
    try:
        post = await handler.regenerate_image(post_id, image_style)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    img_result = await db.execute(select(ImageAsset).where(ImageAsset.post_id == post.id))
    images = img_result.scalars().all()
    return {
        "message": "Image regenerated" if post.image_status == "generated" else "Image generation failed",
        "post_id": post.id,
        "image_status": post.image_status,
        "image_error": post.image_error or "",
        "image_url": images[0].url if images else "",
    }


@router.get("/images/{key}")
async def get_image(key: str):
    """Serve a stored image. Keys are unguessable UUID file names (needed so <img> tags work)."""
    found = await get_image_storage().get(key)
    if not found:
        raise HTTPException(status_code=404, detail="Image not found")
    data, mime = found
    return Response(content=data, media_type=mime, headers={"Cache-Control": "public, max-age=86400"})


# ─── Brand Voice CRUD ─────────────────────────────────────────

@router.get("/brand-voices", response_model=list[BrandVoiceOut])
async def list_brand_voices(
    store_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """List all brand voice profiles for a store."""
    handler = ContentGenerationHandler(db=db)
    return await handler.list_brand_voices(store_id)


@router.post("/brand-voices", response_model=BrandVoiceOut)
async def create_brand_voice(
    store_id: int,
    body: BrandVoiceCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Create a new brand voice profile."""
    handler = ContentGenerationHandler(db=db)
    return await handler.create_brand_voice(
        store_id=store_id,
        name=body.name,
        tone_guidelines=body.tone_guidelines,
        keywords_to_use=body.keywords_to_use,
        keywords_to_avoid=body.keywords_to_avoid,
    )


@router.put("/brand-voices/{voice_id}", response_model=BrandVoiceOut)
async def update_brand_voice(
    voice_id: int,
    body: BrandVoiceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Update a brand voice profile."""
    handler = ContentGenerationHandler(db=db)
    try:
        return await handler.update_brand_voice(
            voice_id=voice_id,
            name=body.name,
            tone_guidelines=body.tone_guidelines,
            keywords_to_use=body.keywords_to_use,
            keywords_to_avoid=body.keywords_to_avoid,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/brand-voices/{voice_id}")
async def delete_brand_voice(voice_id: int, db: AsyncSession = Depends(get_db), _auth=Depends(get_current_user)):
    """Delete a brand voice profile."""
    result = await db.execute(select(BrandVoiceProfile).where(BrandVoiceProfile.id == voice_id))
    bv = result.scalar_one_or_none()
    if not bv:
        raise HTTPException(status_code=404, detail="Brand voice not found")
    await db.delete(bv)
    await db.commit()
    return {"status": "deleted"}
