import express from 'express';
import prisma from '../utils/prisma.js';
import { getCache, setCache } from '../utils/cache.js';

const router = express.Router();

function mapVideo(v) {
  return {
    id: v.id?.toString?.() || v.id,
    uuid: v.uuid,
    title: v.title,
    slug: v.slug,
    description: v.description,
    duration: v.duration || 0,
    views: Number(v.views || 0),
    sourceViews: v.sourceViews,
    channelName: v.channelName,
    channelUrl: v.channelUrl,
    channelLogo: v.channelLogo,
    thumbnail: v.thumbnail,
    thumbnails: v.thumbnails,
    sprite: v.sprite,
    previewVideos: v.previewVideos,
    m3u8Links: v.m3u8Links,
    directVideoLinks: v.directVideoLinks,
    status: v.status,
    createdAt: v.createdAt,
  };
}

// GET /api/videos?limit=24&sort=latest|trending|featured&q=...
router.get('/', async (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=3600, stale-while-revalidate=86400');
  try {
    const limit = Math.min(parseInt(req.query.limit || '24', 10), 100);
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const sort = req.query.sort || 'latest';
    const q = (req.query.q || '').trim();
    const skip = (page - 1) * limit;

    const cacheKey = `videos_list_${page}_${limit}_${sort}_${q}`;
    const cached = await getCache(cacheKey);
    if (cached) return res.json(cached);

    let orderBy = { createdAt: 'desc' };
    if (sort === 'trending') orderBy = { views: 'desc' };
    if (sort === 'featured') orderBy = [{ isFeatured: 'desc' }, { createdAt: 'desc' }];

    const where = {
      status: 'active',
      ...(q
        ? {
            OR: [
              { title: { contains: q } },
              { channelName: { contains: q } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      prisma.video.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      prisma.video.count({ where }),
    ]);

    const result = {
      data: data.map(mapVideo),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };

    await setCache(cacheKey, result, 60);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/videos/search
router.get('/search', async (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=3600, stale-while-revalidate=86400');
  try {
    const q = (req.query.q || '').trim();
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '24', 10);
    const skip = (page - 1) * limit;

    if (!q) {
      return res.json({ data: [], pagination: { page, limit, total: 0, pages: 0 } });
    }

    const cacheKey = `videos_search_${page}_${limit}_${q}`;
    const cached = await getCache(cacheKey);
    if (cached) return res.json(cached);

    const where = {
      status: 'active',
      OR: [{ title: { contains: q } }, { channelName: { contains: q } }],
    };

    const [data, total] = await Promise.all([
      prisma.video.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.video.count({ where }),
    ]);

    const result = {
      data: data.map(mapVideo),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };

    await setCache(cacheKey, result, 60);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/videos/slug/:slug
router.get('/slug/:slug', async (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=1800, stale-while-revalidate=86400');
  try {
    const slugKey = `video_slug_${req.params.slug}`;
    const cached = await getCache(slugKey);
    if (cached) {
      // Async view increment
      prisma.video.update({
        where: { uuid: cached.uuid },
        data: { views: { increment: 1 } },
      }).catch(() => null);
      return res.json(cached);
    }

    const video = await prisma.video.findFirst({
      where: { slug: req.params.slug },
    });
    if (!video) return res.status(404).json({ error: 'Video not found' });

    // View count increment asynchronously
    prisma.video.update({
      where: { id: video.id },
      data: { views: { increment: 1 } },
    }).catch(() => null);

    const result = mapVideo(video);
    await setCache(slugKey, result, 120);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/videos/uuid/:uuid
router.get('/uuid/:uuid', async (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=3600, stale-while-revalidate=86400');
  try {
    const uuidKey = `video_uuid_${req.params.uuid}`;
    const cached = await getCache(uuidKey);
    if (cached) return res.json(cached);

    const video = await prisma.video.findUnique({ where: { uuid: req.params.uuid } });
    if (!video) return res.status(404).json({ error: 'Video not found' });

    const result = mapVideo(video);
    await setCache(uuidKey, result, 120);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/videos/:uuid/view
router.post('/:uuid/view', async (req, res) => {
  try {
    const video = await prisma.video.update({
      where: { uuid: req.params.uuid },
      data: { views: { increment: 1 } },
      select: { uuid: true, views: true },
    });
    res.json({ message: 'View recorded', views: Number(video.views) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
