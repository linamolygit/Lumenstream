from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, HttpUrl
from .database import get_db, engine, Base
from .models import Video, VideoStatus
from .engine.extractor import AdvancedXHExtractor
import uuid

app = FastAPI(title="MediaHoster Scraper Service", version="1.0")

extractor = AdvancedXHExtractor()

class ScrapeRequest(BaseModel):
    url: HttpUrl

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/scrape/single")
async def scrape_single(payload: ScrapeRequest, db: AsyncSession = Depends(get_db)):
    url = str(payload.url)
    data = extractor.extract_single(url)
    
    if not data or not data.get("title"):
        raise HTTPException(status_code=400, detail="Failed to extract video data")

    # Check if already exists
    result = await db.execute(select(Video).where(Video.source_page_url == url))
    existing = result.scalar_one_or_none()
    if existing:
        return {"message": "Video already exists", "uuid": existing.uuid}

    video = Video(
        uuid=data["uuid"],
        source_page_url=data["source_page_url"],
        title=data["title"],
        slug=data["slug"],
        duration=data.get("duration") or 0,
        source_views=data.get("source_views"),
        channel_name=data.get("channel_name"),
        channel_url=data.get("channel_url"),
        channel_logo=data.get("channel_logo"),
        thumbnail=data.get("thumbnail"),
        thumbnails=data.get("thumbnails"),
        sprite=data.get("sprite"),
        preview_videos=data.get("preview_videos"),
        m3u8_links=data.get("m3u8_links"),
        direct_video_links=data.get("direct_video_links"),
        status=VideoStatus.active
    )
    db.add(video)
    await db.commit()
    await db.refresh(video)

    return {
        "message": "Video scraped successfully",
        "uuid": video.uuid,
        "title": video.title,
        "slug": video.slug
    }
