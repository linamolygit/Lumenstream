import express from 'express';
import crypto from 'crypto';
import dotenv from 'dotenv';
import prisma from '../utils/prisma.js';
import { protect, adminOnly } from '../middleware/auth.js';

dotenv.config();

const router = express.Router();

const SCRAPER_URL = process.env.SCRAPER_URL || 'http://localhost:8000';
const WORKER_PUBLIC_URL = process.env.WORKER_PUBLIC_URL || process.env.NEXT_PUBLIC_WORKER_URL || 'http://localhost:8787';
const STREAM_SIGN_SECRET = process.env.STREAM_SIGN_SECRET || process.env.JWT_SECRET || 'super-long-random-secret-key-change-this';

async function callScraper(path, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120000);
  try {
    const res = await fetch(`${SCRAPER_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || data.detail || 'Scrape failed');
      err.status = res.status;
      throw err;
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
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

// PUT /api/admin/settings
router.put('/settings', async (req, res) => {
  try {
    res.json({ message: 'Settings saved', settings: req.body });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
