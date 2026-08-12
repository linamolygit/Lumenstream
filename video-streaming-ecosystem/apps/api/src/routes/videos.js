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
          sprite: true,
          previewVideos: true,
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

// SEARCH
router.get('/search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 24;
    const skip = (page - 1) * limit;

    if (!q) {
      return res.json({ data: [], pagination: { page, limit, total: 0, pages: 0 } });
    }

    const where = {
      status: 'active',
      OR: [
        { title: { contains: q } },
        { channelName: { contains: q } },
      ],
    };

    const [videos, total] = await Promise.all([
      prisma.video.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          uuid: true, title: true, slug: true, thumbnail: true,
          duration: true, views: true, sourceViews: true, channelName: true,
          sprite: true, previewVideos: true
        }
      }),
      prisma.video.count({ where })
    ]);

    res.json({
      data: videos,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CATEGORY (simple tag-based for now)
router.get('/category/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 24;
    const skip = (page - 1) * limit;

    const where = {
      status: 'active',
      title: { contains: slug.replace(/-/g, ' ') }
    };

    const [videos, total] = await Promise.all([
      prisma.video.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          uuid: true, title: true, slug: true, thumbnail: true,
          duration: true, views: true, sourceViews: true, channelName: true,
          sprite: true, previewVideos: true
        }
      }),
      prisma.video.count({ where })
    ]);

    res.json({
      category: slug,
      data: videos,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CHANNEL
router.get('/channel/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 24;
    const skip = (page - 1) * limit;

    const channelName = slug.replace(/-/g, ' ');

    const where = {
      status: 'active',
      channelName: { contains: channelName }
    };

    const [videos, total] = await Promise.all([
      prisma.video.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          uuid: true, title: true, slug: true, thumbnail: true,
          duration: true, views: true, sourceViews: true,
          channelName: true, channelLogo: true,
          sprite: true, previewVideos: true
        }
      }),
      prisma.video.count({ where })
    ]);

    res.json({
      channel: channelName,
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
