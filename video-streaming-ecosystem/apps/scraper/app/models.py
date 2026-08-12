from sqlalchemy import Column, BigInteger, String, Text, Integer, Boolean, DateTime, JSON, Enum, ForeignKey
from sqlalchemy.sql import func
from .database import Base
import enum

class UserRole(str, enum.Enum):
    admin = "admin"
    user = "user"

class User(Base):
    __tablename__ = "users"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(150))
    role = Column(Enum(UserRole), default=UserRole.user)
    is_active = Column(Boolean, default=True)
    last_login_at = Column(DateTime)
    reset_token = Column(String(255))
    reset_token_expiry = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

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
    scraped_by_id = Column(BigInteger, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    last_checked_at = Column(DateTime)
