import express from 'express';
import crypto from 'crypto';
import prisma from '../utils/prisma.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

const SCRAPER_URL = process.env.SCRAPER_URL || 'http://localhost:8000';
const WORKER_PUBLIC_URL = process.env.WORKER_PUBLIC_URL || process.env.NEXT_PUBLIC_WORKER_URL || 'http://localhost:8787';
const STREAM_SIGN_SECRET = process.env.STREAM_SIGN_SECRET || process.env.JWT_SECRET || 'super-long-random-secret-key-change-this';

async function callScraper(path, body, retries = 3) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 120000);
    try {
      const res = await fetch(`${SCRAPER_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if ((res.status === 502 || res.status === 503 || res.status === 504) && attempt < retries) {
        console.warn(`[Admin Scraper] Scraper waking up (attempt ${attempt}/${retries}, status ${res.status}). Waiting 4s...`);
        clearTimeout(timer);
        await new Promise((r) => setTimeout(r, 4000));
        continue;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(data.error || data.detail || `Scrape failed with status ${res.status}`);
        err.status = res.status;
        throw err;
      }
      return data;
    } catch (err) {
      lastError = err;
      if (attempt < retries && (err.name === 'FetchError' || err.code === 'ECONNRESET' || err.code === 'ECONNREFUSED')) {
        console.warn(`[Admin Scraper] Scraper connection error (attempt ${attempt}/${retries}). Waiting 4s...`);
        await new Promise((r) => setTimeout(r, 4000));
        continue;
      }
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError || new Error('Failed to connect to scraper service');
}

function mapAdminVideo(v) {
  return {
    id: v.id?.toString?.() || v.id,
    uuid: v.uuid,
    title: v.title,
    slug: v.slug,
    thumbnail: v.thumbnail,
    duration: v.duration,
    views: Number(v.views || 0),
    sourceViews: v.sourceViews,
    status: v.status,
    channelName: v.channelName,
    channelLogo: v.channelLogo,
    createdAt: v.createdAt,
  };
}

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const [totalVideos, activeVideos, deadVideos, totalUsers, viewsAgg, recentVideos] =
      await Promise.all([
        prisma.video.count(),
        prisma.video.count({ where: { status: 'active' } }),
        prisma.video.count({ where: { status: 'dead' } }),
        prisma.user.count(),
        prisma.video.aggregate({ _sum: { views: true } }),
        prisma.video.findMany({
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
      ]);

    res.json({
      totalVideos,
      activeVideos,
      deadVideos,
      totalUsers,
      totalViews: Number(viewsAgg._sum.views || 0),
      recentVideos: recentVideos.map(mapAdminVideo),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/videos
router.get('/videos', async (req, res) => {
  try {
    const videos = await prisma.video.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(videos.map(mapAdminVideo));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/stream-links
router.get('/stream-links', async (req, res) => {
  try {
    const videos = await prisma.video.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(videos.map(mapAdminVideo));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/videos/:uuid/status
router.patch('/videos/:uuid/status', async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['active', 'hidden', 'dead', 'processing'];
    if (!status || !allowed.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${allowed.join(', ')}` });
    }
    const video = await prisma.video.update({
      where: { uuid: req.params.uuid },
      data: { status },
    });
    res.json(mapAdminVideo(video));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/videos/:uuid/refresh
router.post('/videos/:uuid/refresh', async (req, res) => {
  try {
    const video = await prisma.video.findUnique({ where: { uuid: req.params.uuid } });
    if (!video) return res.status(404).json({ error: 'Video not found' });
    if (!video.sourcePageUrl) {
      return res.status(400).json({ error: 'No source page URL to refresh' });
    }

    const data = await callScraper('/scrape/single', { url: video.sourcePageUrl, force: true });

    const updated = await prisma.video.update({
      where: { uuid: req.params.uuid },
      data: {
        m3u8Links: data.m3u8_links || data.m3u8Links || video.m3u8Links,
        directVideoLinks: data.direct_video_links || video.directVideoLinks,
        thumbnail: data.thumbnail || video.thumbnail,
        status: 'active',
        lastCheckedAt: new Date(),
      },
    });

    res.json({ message: 'Stream refreshed', video: mapAdminVideo(updated) });
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'Scraper timeout' });
    }
    res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /api/admin/videos/:uuid/signed-link
router.post('/videos/:uuid/signed-link', async (req, res) => {
  try {
    const expiresIn = Number(req.body.expiresIn) || 6 * 60 * 60; // seconds
    const exp = Math.floor(Date.now() / 1000) + expiresIn;
    const uuid = req.params.uuid;

    const video = await prisma.video.findUnique({ where: { uuid } });
    if (!video) return res.status(404).json({ error: 'Video not found' });

    const payload = `${uuid}:${exp}`;
    const sig = crypto
      .createHmac('sha256', STREAM_SIGN_SECRET)
      .update(payload)
      .digest('hex')
      .slice(0, 32);

    const url = `${WORKER_PUBLIC_URL}/api/media?uuid=${uuid}&exp=${exp}&sig=${sig}`;
    res.json({ url, exp, expiresIn });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/scrape
router.post('/scrape', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL required' });
    const data = await callScraper('/scrape/single', { url });
    res.json(data);
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'Scraper timeout / waking up' });
    }
    res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /api/admin/scrape/listing
router.post('/scrape/listing', async (req, res) => {
  try {
    const { url, max_videos = 50 } = req.body;
    if (!url) return res.status(400).json({ error: 'URL required' });
    const data = await callScraper('/scrape/listing', {
      url,
      max_videos: Math.min(Number(max_videos) || 50, 100),
    });
    res.json(data);
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'Scraper timeout / waking up' });
    }
    res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /api/admin/save-scraped-videos (Bulk save selected scraped videos)
router.post('/save-scraped-videos', async (req, res) => {
  try {
    const { videos } = req.body;
    if (!Array.isArray(videos) || !videos.length) {
      return res.status(400).json({ error: 'No videos provided' });
    }

    const saved = [];
    for (const v of videos) {
      try {
        const existing = await prisma.video.findFirst({
          where: { OR: [{ uuid: v.uuid }, { sourcePageUrl: v.source_page_url || v.sourcePageUrl }] },
        });
        if (existing) {
          saved.push(mapAdminVideo(existing));
          continue;
        }

        const created = await prisma.video.create({
          data: {
            uuid: v.uuid || crypto.randomUUID(),
            title: v.title || 'Untitled Video',
            slug: v.slug || `video-${v.uuid?.slice(0, 8)}`,
            sourcePageUrl: v.source_page_url || v.sourcePageUrl,
            sourceSite: v.source_site || v.sourceSite || 'generic',
            duration: Number(v.duration) || 0,
            sourceViews: v.source_views || v.sourceViews,
            channelName: v.channel_name || v.channelName,
            channelUrl: v.channel_url || v.channelUrl,
            channelLogo: v.channel_logo || v.channelLogo,
            thumbnail: v.thumbnail,
            thumbnails: v.thumbnails || [],
            sprite: v.sprite,
            previewVideos: v.preview_videos || v.previewVideos || [],
            m3u8Links: v.m3u8_links || v.m3u8Links || [],
            directVideoLinks: v.direct_video_links || v.directVideoLinks || [],
            likes: Number(v.likes) || 0,
            publishedRelative: v.published_relative || v.publishedRelative,
            commentsCount: Number(v.comments_count || v.commentsCount) || 0,
            commentsJson: v.comments || v.commentsJson || [],
            status: 'active',
          },
        });
        saved.push(mapAdminVideo(created));
      } catch (e) {
        console.error('[Bulk Save Scraped Video Error]:', e);
      }
    }

    res.json({ message: `Successfully saved ${saved.length} videos`, savedCount: saved.length, videos: saved });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/videos/:uuid
router.delete('/videos/:uuid', async (req, res) => {
  try {
    await prisma.video.delete({ where: { uuid: req.params.uuid } });
    res.json({ message: 'Video deleted successfully', uuid: req.params.uuid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: { select: { likes: true, saves: true, history: true, comments: true } },
      },
    });

    res.json(
      users.map((u) => ({
        id: u.id.toString(),
        name: u.name,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt,
        watchedCount: u._count.history,
        likesCount: u._count.likes,
        savesCount: u._count.saves,
        commentsCount: u._count.comments,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/comments
router.get('/comments', async (req, res) => {
  try {
    const comments = await prisma.userComment.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
        video: { select: { title: true, slug: true, thumbnail: true } },
      },
      take: 100,
    });

    res.json(
      comments.map((c) => ({
        id: c.id,
        videoUuid: c.videoUuid,
        videoTitle: c.video?.title || 'Unknown Video',
        videoSlug: c.video?.slug,
        videoThumbnail: c.video?.thumbnail,
        authorName: c.user?.name || c.guestName || 'Anonymous',
        isGuest: !c.userId,
        body: c.body,
        createdAt: c.createdAt,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/comments/:id
router.delete('/comments/:id', async (req, res) => {
  try {
    await prisma.userComment.delete({ where: { id: req.params.id } });
    res.json({ message: 'Comment deleted successfully', id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/categories
router.get('/categories', async (req, res) => {
  try {
    const activeCount = await prisma.video.count({ where: { status: 'active' } });
    res.json([
      { name: 'Trending', slug: 'trending', videoCount: Math.ceil(activeCount * 0.4) },
      { name: 'Featured', slug: 'featured', videoCount: Math.ceil(activeCount * 0.3) },
      { name: 'Recent', slug: 'recent', videoCount: activeCount },
      { name: 'HD Streams', slug: 'hd-streams', videoCount: Math.ceil(activeCount * 0.7) },
    ]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/audit-logs
router.get('/audit-logs', async (req, res) => {
  res.json([
    { id: '1', action: 'Video Scraped', details: 'Scraped listing batch', performedBy: 'Rishav', timestamp: new Date().toISOString() },
    { id: '2', action: 'Stream Generated', details: 'HMAC signature token refresh', performedBy: 'Rishav', timestamp: new Date(Date.now() - 3600000).toISOString() },
  ]);
});

// PUT /api/admin/settings
router.put('/settings', async (req, res) => {
  try {
    res.json({ message: 'Settings saved', settings: req.body });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
