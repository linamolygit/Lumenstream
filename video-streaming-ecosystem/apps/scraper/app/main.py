from datetime import datetime
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from pydantic import BaseModel, HttpUrl
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from .database import get_db, engine, Base
from .models import Video, VideoStatus
from .engine.extractor import AdvancedMultiSiteExtractor
import uuid

app = FastAPI(title="MediaHoster Scraper Service", version="1.0")

extractor = AdvancedMultiSiteExtractor()

class ScrapeRequest(BaseModel):
    url: HttpUrl

class ListingRequest(BaseModel):
    url: HttpUrl
    max_videos: int = 20

class RefreshRequest(BaseModel):
    uuid: str

class BulkRefreshRequest(BaseModel):
    limit: int = 20
    only_dead: bool = True

@app.on_event("startup")
async def startup():
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("[startup] DB tables ready")
    except Exception as e:
        print(f"[startup] DB not ready yet — scrape endpoints will error until DB is accessible: {e}")

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/scrape/single")
async def scrape_single(payload: ScrapeRequest, db: AsyncSession = Depends(get_db)):
    url = str(payload.url)
    data = extractor.extract_single(url)
    
    if not data or not data.get("title"):
        raise HTTPException(status_code=400, detail="Failed to extract video data")

    try:
        # Check if already exists in DB
        result = await db.execute(select(Video).where(Video.source_page_url == url))
        existing = result.scalar_one_or_none()
        if existing:
            return {"message": "Video already exists", "uuid": existing.uuid, "title": existing.title, "slug": existing.slug}

        video = Video(
            uuid=data["uuid"],
            source_page_url=data["source_page_url"],
            source_site=data.get("source_site", "generic"),
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
            likes=data.get("likes") or 0,
            published_relative=data.get("published_relative"),
            comments_count=data.get("comments_count") or 0,
            comments_json=data.get("comments"),
            status=VideoStatus.active
        )
        db.add(video)
        await db.commit()
        await db.refresh(video)

        return {
            "message": "Video scraped successfully",
            "uuid": video.uuid,
            "title": video.title,
            "slug": video.slug,
            "thumbnail": video.thumbnail,
            "duration": video.duration,
            "m3u8_links": video.m3u8_links
        }
    except Exception as db_err:
        print(f"[Scrape Single DB Error]: {db_err}")
        return {
            "message": "Video scraped (DB save pending remote access)",
            "uuid": data["uuid"],
            "title": data["title"],
            "slug": data["slug"],
            "thumbnail": data.get("thumbnail"),
            "duration": data.get("duration"),
            "m3u8_links": data.get("m3u8_links"),
            "db_error": str(db_err)
        }

@app.post("/scrape/listing")
async def scrape_listing(payload: ListingRequest, db: AsyncSession = Depends(get_db)):
    listing_url = str(payload.url)
    video_urls = extractor.extract_listing(listing_url, max_videos=payload.max_videos)

    if not video_urls:
        raise HTTPException(status_code=400, detail="No video links found on this page")

    results = []
    for video_url in video_urls:
        try:
            existing = await db.execute(
                select(Video).where(Video.source_page_url == video_url)
            )
            existing_video = existing.scalar_one_or_none()
            if existing_video:
                results.append({
                    "url": video_url,
                    "status": "already_exists",
                    "uuid": existing_video.uuid,
                    "title": existing_video.title
                })
                continue

            data = extractor.extract_single(video_url)
            if not data or not data.get("title"):
                results.append({"url": video_url, "status": "failed"})
                continue

            video = Video(
                uuid=data["uuid"],
                source_page_url=data["source_page_url"],
                source_site=data.get("source_site", "generic"),
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
            results.append({
                "url": video_url,
                "status": "scraped",
                "uuid": data["uuid"],
                "title": data["title"],
                "thumbnail": data.get("thumbnail")
            })
        except Exception as item_err:
            print(f"[Scrape Listing Item DB Error]: {item_err}")
            results.append({
                "url": video_url,
                "status": "scraped_db_pending",
                "title": video_url
            })

    return {
        "message": f"Processed {len(results)} videos",
        "results": results,
    }

@app.post("/refresh/single")
async def refresh_single(payload: RefreshRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Video).where(Video.uuid == payload.uuid))
    video = result.scalar_one_or_none()
    
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    if not video.source_page_url:
        raise HTTPException(status_code=400, detail="No source URL available")

    refresh_data = extractor.refresh_m3u8(video.source_page_url)

    if refresh_data["success"]:
        video.m3u8_links = refresh_data["m3u8_links"]
        video.direct_video_links = refresh_data["direct_video_links"]
        if refresh_data.get("duration"):
            video.duration = refresh_data["duration"]
        video.status = VideoStatus.active
        video.last_checked_at = datetime.utcnow()
        await db.commit()
        
        return {
            "message": "Stream refreshed successfully",
            "uuid": video.uuid,
            "m3u8_count": len(refresh_data["m3u8_links"]),
            "status": "active"
        }
    else:
        video.status = VideoStatus.dead
        video.last_checked_at = datetime.utcnow()
        await db.commit()
        
        return {
            "message": "Failed to refresh stream",
            "uuid": video.uuid,
            "error": refresh_data.get("error"),
            "status": "dead"
        }

@app.post("/refresh/bulk")
async def refresh_bulk(payload: BulkRefreshRequest, db: AsyncSession = Depends(get_db)):
    query = select(Video).order_by(Video.last_checked_at.asc().nullsfirst())
    
    if payload.only_dead:
        query = query.where(Video.status.in_([VideoStatus.dead, VideoStatus.active]))
    
    query = query.limit(payload.limit)
    
    result = await db.execute(query)
    videos = result.scalars().all()
    
    results = []
    
    for video in videos:
        if not video.source_page_url:
            results.append({"uuid": video.uuid, "status": "skipped", "reason": "no source url"})
            continue
            
        refresh_data = extractor.refresh_m3u8(video.source_page_url)
        
        if refresh_data["success"]:
            video.m3u8_links = refresh_data["m3u8_links"]
            video.direct_video_links = refresh_data["direct_video_links"]
            video.status = VideoStatus.active
            video.last_checked_at = datetime.utcnow()
            status = "refreshed"
        else:
            video.status = VideoStatus.dead
            video.last_checked_at = datetime.utcnow()
            status = "dead"
        
        await db.commit()
        results.append({
            "uuid": video.uuid,
            "title": video.title[:60],
            "status": status
        })
    
    return {
        "message": f"Processed {len(results)} videos",
        "results": results
    }
