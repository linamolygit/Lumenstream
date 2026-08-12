from sqlalchemy import Column, BigInteger, String, Text, Integer, Boolean, DateTime, JSON, Enum, ForeignKey
from sqlalchemy.sql import func
from .database import Base
import enum

class VideoStatus(str, enum.Enum):
    active = "active"
    dead = "dead"
    processing = "processing"
    hidden = "hidden"

class Video(Base):
    __tablename__ = "videos"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    uuid = Column(String(36), unique=True, nullable=False, index=True)
    source_id = Column(String(50))
    source_page_url = Column(Text)
    source_site = Column(String(100), default="xhamster")
    title = Column(String(500), nullable=False)
    slug = Column(String(500), nullable=False, index=True)
    description = Column(Text)
    duration = Column(Integer, default=0)
    views = Column(BigInteger, default=0)
    source_views = Column(String(50))
    channel_id = Column(BigInteger, ForeignKey("channels.id"), nullable=True)
    channel_name = Column(String(255))
    channel_url = Column(Text)
    channel_logo = Column(Text)
    thumbnail = Column(Text)
    thumbnails = Column(JSON)
    sprite = Column(Text)
    preview_videos = Column(JSON)
    m3u8_links = Column(JSON)
    direct_video_links = Column(JSON)
    status = Column(Enum(VideoStatus), default=VideoStatus.active)
    is_featured = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    last_checked_at = Column(DateTime)
