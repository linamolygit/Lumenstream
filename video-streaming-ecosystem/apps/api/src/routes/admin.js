import express from 'express';
import prisma from '../utils/prisma.js';

const router = express.Router();

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

// Trigger scrape (calls FastAPI)
router.post('/scrape', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL required' });

    const response = await fetch((process.env.SCRAPER_URL || 'http://localhost:8000') + '/scrape/single', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
