from sqlalchemy import Column, Integer, BigInteger, String, Text, DateTime, Boolean, Enum, JSON, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(150))
    role = Column(Enum("admin", "user", name="user_role"), nullable=False, default="user")
    is_active = Column(Boolean, default=True)
    last_login_at = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

class Channel(Base):
    __tablename__ = "channels"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    logo_url = Column(Text)
    source_url = Column(Text)
    description = Column(Text)
    video_count = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

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
    channel_id = Column(BigInteger, ForeignKey("channels.id"), index=True)
    channel_name = Column(String(255))
    channel_url = Column(Text)
    channel_logo = Column(Text)
    thumbnail = Column(Text)
    thumbnails = Column(JSON)
    sprite = Column(Text)
    preview_videos = Column(JSON)
    m3u8_links = Column(JSON)
    direct_video_links = Column(JSON)
    status = Column(Enum("active", "dead", "processing", "hidden", name="video_status"), default="active", index=True)
    is_featured = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, server_default=func.now(), index=True)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    last_checked_at = Column(DateTime)

class StreamLog(Base):
    __tablename__ = "stream_logs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    video_uuid = Column(String(36), nullable=False, index=True)
    ip = Column(String(45))
    user_agent = Column(Text)
    referer = Column(Text)
    country = Column(String(10))
    watched_seconds = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now(), index=True)

class Like(Base):
    __tablename__ = "likes"

    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    video_id = Column(BigInteger, ForeignKey("videos.id", ondelete="CASCADE"), primary_key=True)
    created_at = Column(DateTime, server_default=func.now())

class Comment(Base):
    __tablename__ = "comments"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    video_id = Column(BigInteger, ForeignKey("videos.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    is_approved = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

