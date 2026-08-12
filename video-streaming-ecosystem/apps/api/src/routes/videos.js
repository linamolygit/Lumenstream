import express from 'express';
import prisma from '../utils/prisma.js';

const router = express.Router();

// Public: Get videos (Home page)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 24;
    const skip = (page - 1) * limit;

    const [videos, total] = await Promise.all([
      prisma.video.findMany({
        where: { status: 'active' },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          uuid: true,
          title: true,
          slug: true,
          duration: true,
          views: true,
          sourceViews: true,
          thumbnail: true,
          channelName: true,
          createdAt: true
        }
      }),
      prisma.video.count({ where: { status: 'active' } })
    ]);

    res.json({
      data: videos,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single video by slug
router.get('/slug/:slug', async (req, res) => {
  try {
    const video = await prisma.video.findFirst({
      where: { slug: req.params.slug, status: 'active' }
    });
    if (!video) return res.status(404).json({ error: 'Video not found' });
    res.json(video);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Used by Cloudflare Worker
router.get('/uuid/:uuid', async (req, res) => {
  try {
    const video = await prisma.video.findUnique({
      where: { uuid: req.params.uuid },
      select: {
        uuid: true,
        title: true,
        m3u8Links: true,
        directVideoLinks: true,
        status: true
      }
    });
    if (!video || video.status !== 'active') {
      return res.status(404).json({ error: 'Video not found or inactive' });
    }
    res.json(video);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
