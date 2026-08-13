import express from 'express';
import prisma from '../utils/prisma.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

const SCRAPER_URL = process.env.SCRAPER_URL || 'http://localhost:8000';

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
        console.warn(`[User Scraper] Scraper waking up (attempt ${attempt}/${retries}, status ${res.status}). Waiting 4s...`);
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
        console.warn(`[User Scraper] Scraper connection error (attempt ${attempt}/${retries}). Waiting 4s...`);
        await new Promise((r) => setTimeout(r, 4000));
        continue;
      }
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError || new Error('Failed to connect to scraper service');
}

// GET /api/user/my-videos
router.get('/my-videos', protect, async (req, res) => {
  try {
    const videos = await prisma.video.findMany({
      where: { scrapedById: BigInt(req.user.userId) },
      orderBy: { createdAt: 'desc' },
    });
    res.json(
      videos.map((v) => ({
        uuid: v.uuid,
        title: v.title,
        slug: v.slug,
        thumbnail: v.thumbnail,
        duration: v.duration,
        views: Number(v.views || 0),
        sourceViews: v.sourceViews,
        channelName: v.channelName,
        channelLogo: v.channelLogo,
        status: v.status,
        createdAt: v.createdAt,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/user/scrape  { url, max_videos? }
router.post('/scrape', protect, async (req, res) => {
  try {
    const { url, max_videos = 20 } = req.body;
    if (!url) return res.status(400).json({ error: 'URL required' });

    const isListing = Number(max_videos) > 1;

    let data;
    if (isListing) {
      data = await callScraper('/scrape/listing', {
        url,
        max_videos: Math.min(Number(max_videos) || 20, 50),
      });
    } else {
      data = await callScraper('/scrape/single', { url });
    }

    // Attach scrapedById for results that have uuid
    if (Array.isArray(data.results)) {
      const uuids = data.results.filter((r) => r.uuid).map((r) => r.uuid);
      if (uuids.length) {
        await prisma.video.updateMany({
          where: { uuid: { in: uuids } },
          data: { scrapedById: BigInt(req.user.userId) },
        });
      }
    } else if (data.uuid) {
      await prisma.video.updateMany({
        where: { uuid: data.uuid },
        data: { scrapedById: BigInt(req.user.userId) },
      });
    }

    res.json(data);
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({
        error: 'Scraper is waking up or taking too long. Please try again in a minute.',
      });
    }
    res.status(err.status || 500).json({ error: err.message });
  }
});

export default router;
