import express from 'express';
import prisma from '../utils/prisma.js';
import { protect } from '../middleware/auth.js';

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
      throw new Error(data.error || data.detail || 'Scrape failed');
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

// User apni scraped videos dekh sake
router.get('/my-videos', protect, async (req, res) => {
  try {
    const videos = await prisma.video.findMany({
      where: { scrapedById: BigInt(req.user.userId) },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        uuid: true,
        title: true,
        slug: true,
        thumbnail: true,
        duration: true,
        views: true,
        status: true,
        channelName: true,
        createdAt: true,
      },
    });
    res.json(videos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// User scrape trigger (single ya listing)
router.post('/scrape', protect, async (req, res) => {
  try {
    const { url, max_videos = 15 } = req.body;
    if (!url) return res.status(400).json({ error: 'URL required' });

    const isListing = !url.includes('/videos/') && !url.includes('/video/');
    const endpoint = isListing ? '/scrape/listing' : '/scrape/single';
    const body = isListing ? { url, max_videos } : { url };

    const data = await callScraper(endpoint, body, 120000);

    // scraped_by update (single case)
    if (data.uuid) {
      await prisma.video.updateMany({
        where: { uuid: data.uuid },
        data: { scrapedById: BigInt(req.user.userId) },
      });
    }

    // listing case
    if (data.results) {
      for (const item of data.results) {
        if (item.uuid) {
          await prisma.video.updateMany({
            where: { uuid: item.uuid },
            data: { scrapedById: BigInt(req.user.userId) },
          });
        }
      }
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
