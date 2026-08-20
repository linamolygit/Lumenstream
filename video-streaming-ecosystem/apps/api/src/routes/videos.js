import express from 'express';
import crypto from 'crypto';
import prisma from '../utils/prisma.js';
import { getCache, setCache, delCache } from '../utils/cache.js';

const router = express.Router();

const refreshPromises = new Map();

function signWorkerUrl(uuid, expSeconds = 900) {
  const workerBase = (process.env.WORKER_URL || 'https://mediahoster-proxy.hirensrivastawa.workers.dev').replace(/\/$/, '');
  const secret = process.env.STREAM_SIGN_SECRET || '7137765914fd7776ced46cf1147fb16a533c0073774e7f6f8ef4d76f8bdb8ce3';
  const exp = Math.floor(Date.now() / 1000) + expSeconds;
  const message = `${uuid}:${exp}`;
  const sigFull = crypto.createHmac('sha256', secret).update(message).digest('hex');
  const sig = sigFull.slice(0, 32);
  return `${workerBase}/api/media?uuid=${encodeURIComponent(uuid)}&exp=${exp}&sig=${sig}`;
}

async function singleflightRefresh(uuid, sourcePageUrl) {
  if (refreshPromises.has(uuid)) {
    return refreshPromises.get(uuid);
  }

  const promise = (async () => {
    try {
      const scraperBase = process.env.SCRAPER_URL || 'https://lumenstream-scraper.onrender.com';
      const scraperRes = await fetch(`${scraperBase}/refresh/single`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uuid }),
      });

      if (!scraperRes.ok && sourcePageUrl) {
        await fetch(`${scraperBase}/scrape/single`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: sourcePageUrl }),
        }).catch(() => {});
      }

      const updated = await prisma.video.findUnique({ where: { uuid } });
      if (updated) {
        await delCache(`video_uuid_${updated.uuid}`);
        if (updated.slug) await delCache(`video_slug_${updated.slug}`);
      }
      return updated;
    } catch (err) {
      console.error(`[Singleflight Refresh Error for ${uuid}]:`, err);
      return null;
    } finally {
      refreshPromises.delete(uuid);
    }
  })();

  refreshPromises.set(uuid, promise);
  return promise;
}

function mapVideo(v, includeRawStreams = false) {
  const obj = {
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
    likes: v.likes || 0,
    publishedAt: v.publishedAt,
    publishedRelative: v.publishedRelative,
    commentsCount: v.commentsCount || 0,
    commentsJson: v.commentsJson,
    status: v.status,
    createdAt: v.createdAt,
  };

  if (includeRawStreams) {
    obj.m3u8Links = v.m3u8Links;
    obj.directVideoLinks = v.directVideoLinks;
  }

  return obj;
}

// GET /api/play/:uuid or /api/videos/play/:identifier or /api/videos/:identifier/play
const handlePlay = async (req, res) => {
  try {
    const { identifier } = req.params;
    const forceRefresh = req.query.forceRefresh === 'true';

    let video = await prisma.video.findFirst({
      where: {
        OR: [{ uuid: identifier }, { slug: identifier }],
      },
    });

    if (!video) return res.status(404).json({ error: 'Video not found' });
    if (video.status === 'dead') return res.status(410).json({ error: 'Stream unavailable' });

    // Check m3u8 freshness (30 min TTL = 1800s)
    const now = new Date();
    const lastChecked = video.lastCheckedAt ? new Date(video.lastCheckedAt) : null;
    const isStale = !lastChecked || (now.getTime() - lastChecked.getTime()) > 1800 * 1000;
    const hasStreams = video.m3u8Links || video.directVideoLinks;

    // Stale-While-Revalidate (SWR): If stale, serve cached stream INSTANTLY (10ms) & refresh in background!
    if (isStale && hasStreams && !forceRefresh) {
      singleflightRefresh(video.uuid, video.sourcePageUrl).catch(() => null);
    } else if (forceRefresh || !hasStreams) {
      const refreshed = await singleflightRefresh(video.uuid, video.sourcePageUrl);
      if (refreshed) video = refreshed;
    }

    // Check if stream link is IP-bound (data=74.220.52.6)
    const rawLinks = [video.m3u8Links, video.directVideoLinks].map(l => typeof l === 'string' ? l : JSON.stringify(l)).join(' ');
    const isIpLocked = /data=\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(rawLinks);
    const apiBase = (process.env.API_BASE_URL || 'https://lumenstream-api.onrender.com').replace(/\/$/, '');

    let playUrl = signWorkerUrl(video.uuid, 900); // Default Cloudflare Worker
    if (isIpLocked) {
      // If stream URL has IP lock, route through Express API proxy (matching Render Scraper IP!)
      playUrl = `${apiBase}/api/videos/proxy-stream?uuid=${video.uuid}`;
    }

    res.json({
      uuid: video.uuid,
      slug: video.slug,
      playUrl,
      isIpLocked,
      expiresIn: 900,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

router.get('/play/:identifier', handlePlay);
router.get('/:identifier/play', handlePlay);

// GET /api/videos/proxy-stream?uuid=... (Render IP Media Proxy for IP-locked streams)
router.get('/proxy-stream', async (req, res, next) => {
  req.params.uuid = req.query.uuid;
  return handleStreamProxy(req, res, next);
});

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
      data: data.map((v) => mapVideo(v, false)),
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
      data: data.map((v) => mapVideo(v, false)),
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
  try {
    const video = await prisma.video.findFirst({
      where: { slug: req.params.slug },
    });
    if (!video) return res.status(404).json({ error: 'Video not found' });

    // View count increment asynchronously
    prisma.video.update({
      where: { id: video.id },
      data: { views: { increment: 1 } },
    }).catch(() => null);

    const likesCount = await prisma.userLike.count({
      where: { videoUuid: video.uuid },
    });

    const result = {
      ...mapVideo(video, false),
      views: Number(video.views) + 1,
      likesCount,
    };
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/videos/uuid/:uuid or /api/videos/:uuid
const handleUuidLookup = async (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=3600, stale-while-revalidate=86400');
  try {
    const uuid = req.params.uuid || req.params.identifier;
    const uuidKey = `video_uuid_${uuid}`;

    // Skip cache if caller (Worker) sends Cache-Control: no-cache — ensures fresh stream links
    const bypassCache = (req.headers['cache-control'] || '').includes('no-cache');
    if (!bypassCache) {
      const cached = await getCache(uuidKey);
      if (cached) return res.json(cached);
    }

    const video = await prisma.video.findFirst({
      where: {
        OR: [{ uuid }, { slug: uuid }],
      },
    });
    if (!video) return res.status(404).json({ error: 'Video not found' });

    const result = mapVideo(video, true); // worker needs raw streams for proxying
    await setCache(uuidKey, result, 120);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

router.get('/uuid/:uuid', handleUuidLookup);
router.get('/:uuid', (req, res, next) => {
  // Prevent matching reserved route sub-paths like /search or /play
  if (['search', 'play', 'uuid', 'slug'].includes(req.params.uuid)) return next();
  handleUuidLookup(req, res);
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

// POST /api/videos/:uuid/refresh (Trigger stream link re-extraction for expired tokens)
router.post('/:uuid/refresh', async (req, res) => {
  try {
    const video = await prisma.video.findUnique({ where: { uuid: req.params.uuid } });
    if (!video) return res.status(404).json({ error: 'Video not found' });

    const updatedVideo = await singleflightRefresh(video.uuid, video.sourcePageUrl);
    if (updatedVideo) {
      return res.json(mapVideo(updatedVideo, true));
    }

    res.json(mapVideo(video, true));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Render-side Stream Proxy ────────────────────────────────────────────────
// Acts as a universal server-side stream pipe for any media host, handling IP-locking and CORS
function proxyHeadersFor(link, mode = 'smart', sourcePageUrl) {
  const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  try {
    const u = new URL(link);
    const host = u.hostname.toLowerCase();

    if (mode === 'clean') {
      return { 'User-Agent': ua, 'Accept': '*/*' };
    }

    if (mode === 'origin') {
      return { 'User-Agent': ua, 'Accept': '*/*', 'Referer': `${u.origin}/`, 'Origin': u.origin };
    }

    if (mode === 'source' && sourcePageUrl) {
      try {
        const su = new URL(sourcePageUrl);
        return { 'User-Agent': ua, 'Accept': '*/*', 'Referer': sourcePageUrl, 'Origin': su.origin };
      } catch {}
    }

    // mode === 'smart' (Canonical tube matching)
    if (host.includes('xhcdn') || host.includes('xhamster') || host.includes('newxh') || host.includes('xhvid')) {
      return { 'User-Agent': ua, 'Referer': 'https://xhamster.com/', 'Origin': 'https://xhamster.com', 'Accept': '*/*' };
    }
    if (host.includes('phncdn') || host.includes('pornhub')) {
      return { 'User-Agent': ua, 'Referer': 'https://www.pornhub.com/', 'Origin': 'https://www.pornhub.com', 'Accept': '*/*' };
    }
    if (host.includes('xvideos') || host.includes('xv-cdn') || host.includes('xvideos-cdn')) {
      return { 'User-Agent': ua, 'Referer': 'https://www.xvideos.com/', 'Origin': 'https://www.xvideos.com', 'Accept': '*/*' };
    }
    if (host.includes('spankbang') || host.includes('sb-cd')) {
      return { 'User-Agent': ua, 'Referer': 'https://spankbang.com/', 'Origin': 'https://spankbang.com', 'Accept': '*/*' };
    }
    if (host.includes('redgifs')) {
      return { 'User-Agent': ua, 'Referer': 'https://www.redgifs.com/', 'Origin': 'https://www.redgifs.com', 'Accept': '*/*' };
    }
    if (host.includes('eporner')) {
      return { 'User-Agent': ua, 'Referer': 'https://www.eporner.com/', 'Origin': 'https://www.eporner.com', 'Accept': '*/*' };
    }

    // Direct MP4 / generic CDN storage hosts
    if (host.includes('files4host') || host.includes('sex303') || host.includes('storage') || host.includes('b-cdn') || link.includes('.mp4')) {
      return { 'User-Agent': ua, 'Accept': '*/*' };
    }

    return { 'User-Agent': ua, 'Referer': `${u.origin}/`, 'Origin': u.origin, 'Accept': '*/*' };
  } catch {
    return { 'User-Agent': ua, 'Accept': '*/*' };
  }
}

function collectLinks(v) {
  const links = [];
  for (const field of [v.directVideoLinks, v.m3u8Links, v.videoUrl]) {
    if (!field) continue;
    let list = field;
    if (typeof list === 'string') { try { list = JSON.parse(list); } catch { list = [list]; } }
    if (Array.isArray(list)) {
      for (const item of list) {
        if (typeof item === 'string' && item.trim()) links.push(item.trim());
        else if (item && typeof item === 'object' && item.url) links.push(item.url);
      }
    } else if (typeof list === 'string' && list.trim()) {
      links.push(list.trim());
    }
  }
  return [...new Set(links)];
}

const handleStreamProxy = async (req, res) => {
  try {
    const uuid = req.params.uuid || req.query.uuid;
    if (!uuid) return res.status(400).json({ error: 'uuid required' });

    let video = await prisma.video.findFirst({ where: { OR: [{ uuid }, { slug: uuid }] } });
    if (!video) return res.status(404).json({ error: 'Video not found' });
    if (video.status === 'dead') return res.status(410).json({ error: 'Stream unavailable' });

    let links = collectLinks(video);

    // If no links, or all links seem expired/IP-locked, trigger a refresh first
    const allExpired = links.every((l) => {
      const m = l.match(/[?&,]end=(\d+)/);
      if (!m) return false;
      return Number(m[1]) < Math.floor(Date.now() / 1000);
    });

    if (links.length === 0 || allExpired) {
      try {
        const refreshed = await singleflightRefresh(uuid, video.sourcePageUrl);
        if (refreshed) {
          video = refreshed;
          links = collectLinks(refreshed);
        }
      } catch {}
    }

    if (links.length === 0) {
      return res.status(404).json({ error: 'No stream links available — try re-scraping this video' });
    }

    const rangeHeader = req.headers['range'] || req.query.range;

    let upstream = null;
    let workingLink = '';
    const modes = ['smart', 'clean', 'origin', 'source'];

    for (const link of links) {
      for (const mode of modes) {
        try {
          const headers = { ...proxyHeadersFor(link, mode, video.sourcePageUrl) };
          if (rangeHeader) headers['Range'] = rangeHeader;
          const r = await fetch(link, { headers, redirect: 'follow' });
          if (r.ok || r.status === 206) {
            upstream = r;
            workingLink = link;
            break;
          }
        } catch {}
      }
      if (upstream) break;
    }

    if (!upstream) {
      return res.status(502).json({
        error: 'Upstream fetch failed — all stream links returned errors',
        debug: { linkCount: links.length, linksPreview: links.map((l) => l.slice(0, 80)) },
      });
    }

    const contentType = upstream.headers.get('content-type') || 'video/mp4';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'private, no-store');

    if (upstream.headers.get('content-range')) res.setHeader('Content-Range', upstream.headers.get('content-range'));
    if (upstream.headers.get('content-length')) res.setHeader('Content-Length', upstream.headers.get('content-length'));

    res.status(upstream.status);

    // Pipe stream bytes
    const { Readable } = await import('stream');
    if (upstream.body) {
      Readable.fromWeb(upstream.body).pipe(res);
    } else {
      res.end();
    }
  } catch (err) {
    console.error('[stream-proxy error]', err);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
};

// GET /api/videos/:uuid/stream-proxy?range=bytes=0-
router.get('/:uuid/stream-proxy', handleStreamProxy);

export default router;

