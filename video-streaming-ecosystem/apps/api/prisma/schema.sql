-- ==============================
-- MediaHoster Pro - Database Schema
-- ==============================

CREATE DATABASE IF NOT EXISTS mediahoster_pro
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE mediahoster_pro;

-- -----------------------------
-- Users Table
-- -----------------------------
CREATE TABLE IF NOT EXISTS users (
    id              BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    name            VARCHAR(150),
    role            ENUM('admin', 'user') DEFAULT 'user',
    is_active       BOOLEAN DEFAULT TRUE,
    last_login_at   DATETIME NULL,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- -----------------------------
-- Channels Table (Optional but useful)
-- -----------------------------
CREATE TABLE IF NOT EXISTS channels (
    id              BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(255) NOT NULL UNIQUE,
    logo_url        TEXT,
    source_url      TEXT,
    description     TEXT,
    video_count     INT DEFAULT 0,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_channels_slug (slug)
) ENGINE=InnoDB;

-- -----------------------------
-- Videos Table (Most Important)
-- -----------------------------
CREATE TABLE IF NOT EXISTS videos (
    id                  BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    
    -- Public unique identifier (used in stream links)
    uuid                CHAR(36) NOT NULL UNIQUE,
    
    -- Source info
    source_id           VARCHAR(50) NULL,                  -- original site video id
    source_page_url     TEXT,
    source_site         VARCHAR(100) DEFAULT 'xhamster',  -- for future multi-source
    
    -- Basic metadata
    title               VARCHAR(500) NOT NULL,
    slug                VARCHAR(500) NOT NULL,
    description         TEXT,
    
    -- Stats
    duration            INT UNSIGNED DEFAULT 0,            -- in seconds
    views               BIGINT UNSIGNED DEFAULT 0,         -- our own views
    source_views        VARCHAR(50) NULL,                 -- original "2.6M views"
    
    -- Channel
    channel_id          BIGINT UNSIGNED NULL,
    channel_name        VARCHAR(255) NULL,
    channel_url         TEXT NULL,
    channel_logo        TEXT NULL,
    
    -- Media assets
    thumbnail           TEXT NULL,                        -- main thumbnail
    thumbnails          JSON NULL,                        -- array of all thumbnails
    sprite              TEXT NULL,
    preview_videos      JSON NULL,                        -- array of preview mp4s
    
    -- Stream links
    m3u8_links          JSON NULL,                        -- array of m3u8 urls
    direct_video_links  JSON NULL,                        -- array of direct mp4/av1
    
    -- Status & flags
    status              ENUM('active', 'dead', 'processing', 'hidden') DEFAULT 'active',
    is_featured         BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_checked_at     DATETIME NULL,                    -- last time we verified m3u8
    
    -- Foreign Key
    CONSTRAINT fk_videos_channel FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE SET NULL,
    
    -- Indexes
    INDEX idx_videos_uuid (uuid),
    INDEX idx_videos_slug (slug),
    INDEX idx_videos_status (status),
    INDEX idx_videos_created (created_at),
    INDEX idx_videos_featured (is_featured),
    INDEX idx_videos_channel (channel_id),
    FULLTEXT INDEX ft_videos_title (title)
) ENGINE=InnoDB;

-- -----------------------------
-- Stream Logs (Analytics)
-- -----------------------------
CREATE TABLE IF NOT EXISTS stream_logs (
    id              BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    video_uuid      CHAR(36) NOT NULL,
    ip              VARCHAR(45),
    user_agent      TEXT,
    referer         TEXT,
    country         VARCHAR(10),
    watched_seconds INT UNSIGNED DEFAULT 0,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_stream_logs_uuid (video_uuid),
    INDEX idx_stream_logs_created (created_at)
) ENGINE=InnoDB;

-- -----------------------------
-- Likes (Future)
-- -----------------------------
CREATE TABLE IF NOT EXISTS likes (
    user_id         BIGINT UNSIGNED NOT NULL,
    video_id        BIGINT UNSIGNED NOT NULL,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, video_id),
    CONSTRAINT fk_likes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_likes_video FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------
-- Comments (Future)
-- -----------------------------
CREATE TABLE IF NOT EXISTS comments (
    id              BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    video_id        BIGINT UNSIGNED NOT NULL,
    user_id         BIGINT UNSIGNED NOT NULL,
    content         TEXT NOT NULL,
    is_approved     BOOLEAN DEFAULT TRUE,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_comments_video FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    CONSTRAINT fk_comments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_comments_video (video_id)
) ENGINE=InnoDB;
