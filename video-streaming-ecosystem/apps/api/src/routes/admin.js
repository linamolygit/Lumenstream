import express from 'express';
import prisma from '../utils/prisma.js';
import { generateSignedUrl } from '../utils/sign.js';

const router = express.Router();

async function callScraper(endpoint, body, timeoutMs = 120000) {
  const scraperUrl = process.env.SCRAPER_URL || 'http://localhost:8000';

  // Early health ping to awaken Render scraper
  fetch(`${scraperUrl}/health`).catch(() => {});

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${scraperUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || data.detail || 'Scraper request failed');
    }
    return data;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Scraper is waking up or taking too long. Please try again in a minute.');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

// ======================
// STATS ENDPOINT
// ======================
router.get('/stats', async (req, res) => {
  try {
    const [
      totalVideos,
      activeVideos,
      deadVideos,
      hiddenVideos,
      processingVideos,
      totalViews,
      totalUsers,
      recentVideos,
    ] = await Promise.all([
      prisma.video.count(),
      prisma.video.count({ where: { status: 'active' } }),
      prisma.video.count({ where: { status: 'dead' } }),
      prisma.video.count({ where: { status: 'hidden' } }),
      prisma.video.count({ where: { status: 'processing' } }),
      prisma.video.aggregate({
        _sum: { views: true },
      }),
      prisma.user.count(),
      prisma.video.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          uuid: true,
          title: true,
          thumbnail: true,
          status: true,
          views: true,
          createdAt: true,
        },
      }),
    ]);

    res.json({
      totalVideos,
      activeVideos,
      deadVideos,
      hiddenVideos,
      processingVideos,
      totalViews: totalViews._sum.views || 0,
      totalUsers,
      recentVideos,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Manage Stream Links - All videos
router.get('/stream-links', async (req, res) => {
  try {
    const videos = await prisma.video.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        uuid: true,
        title: true,
        slug: true,
        thumbnail: true,
        duration: true,
        views: true,
        channelName: true,
        status: true,
        createdAt: true
      }
    });
    res.json(videos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate signed stream link
router.post('/videos/:uuid/signed-link', async (req, res) => {
  try {
    const { uuid } = req.params;
    const expiresIn = Number(req.body.expiresIn) || 6 * 60 * 60; // default 6h

    const video = await prisma.video.findUnique({
      where: { uuid },
      select: { uuid: true, status: true },
    });

    if (!video || video.status !== 'active') {
      return res.status(404).json({ error: 'Video not found or inactive' });
    }

    const signed = generateSignedUrl(uuid, expiresIn);

    res.json({
      message: 'Signed link generated',
      ...signed,
      expiresAt: new Date(signed.exp * 1000).toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update video status / featured
router.patch('/videos/:id', async (req, res) => {
  try {
    const id = BigInt(req.params.id);
    const { status, isFeatured } = req.body;

    const data = {};
    if (status) data.status = status;
    if (typeof isFeatured === 'boolean') data.isFeatured = isFeatured;

    const video = await prisma.video.update({
      where: { id },
      data,
    });

    res.json({ message: 'Updated', video });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Refresh single video
router.post('/videos/:uuid/refresh', async (req, res) => {
  try {
    const { uuid } = req.params;
    const data = await callScraper('/refresh/single', { uuid });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bulk refresh
router.post('/videos/refresh-bulk', async (req, res) => {
  try {
    const { limit = 15, only_dead = true } = req.body;
    const data = await callScraper('/refresh/bulk', { limit, only_dead });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Trigger scrape (single)
router.post('/scrape', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL required' });

    const data = await callScraper('/scrape/single', { url });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Trigger scrape (bulk listing)
router.post('/scrape/listing', async (req, res) => {
  try {
    const { url, max_videos = 20 } = req.body;
    if (!url) return res.status(400).json({ error: 'URL required' });

    const data = await callScraper('/scrape/listing', { url, max_videos });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
