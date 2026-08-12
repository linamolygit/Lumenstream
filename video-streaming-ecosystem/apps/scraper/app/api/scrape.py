from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from ..engine.extractor import extract_video_metadata
from ..db import models
from ..db.database import SessionLocal

router = APIRouter()

class ScrapeUrlRequest(BaseModel):
    url: str

class ScrapeListingRequest(BaseModel):
    listing_url: str
    maximum: int = 20

@router.post("/single")
async def scrape_single(request: ScrapeUrlRequest):
    result = extract_video_metadata(request.url)
    if not result:
        raise HTTPException(status_code=502, detail="Failed to extract metadata")

    db = SessionLocal()
    video = models.Video(**result)
    db.add(video)
    db.commit()
    db.refresh(video)
    db.close()
    return {"video": result}

@router.post("/listing")
async def scrape_listing(request: ScrapeListingRequest):
    # Placeholder: integrate list extraction
    return {"requested": request.listing_url, "maximum": request.maximum}
