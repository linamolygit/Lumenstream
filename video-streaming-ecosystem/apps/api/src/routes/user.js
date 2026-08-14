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

// ─── Helper: fetch video metadata by uuid ────────────────────────────────────
async function getVideoMeta(uuid) {
  return prisma.video.findUnique({
    where: { uuid },
    select: {
      uuid: true, title: true, slug: true, thumbnail: true,
      duration: true, views: true, sourceViews: true,
      channelName: true, channelLogo: true, channelUrl: true,
      status: true, createdAt: true,
    },
  });
}

// ─── GET /api/user/me ─────────────────────────────────────────────────────────
router.get('/me', protect, async (req, res) => {
  try {
    const uid = BigInt(req.user.userId);
    const [user, likeCount, saveCount, historyCount, commentCount] = await Promise.all([
      prisma.user.findUnique({ where: { id: uid }, select: { id: true, name: true, email: true, role: true, createdAt: true } }),
      prisma.userLike.count({ where: { userId: uid } }),
      prisma.userSave.count({ where: { userId: uid } }),
      prisma.watchHistory.count({ where: { userId: uid } }),
      prisma.userComment.count({ where: { userId: uid } }),
    ]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ ...user, id: user.id.toString(), stats: { likes: likeCount, saves: saveCount, history: historyCount, comments: commentCount } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── LIKES ────────────────────────────────────────────────────────────────────
router.post('/like/:uuid', protect, async (req, res) => {
  try {
    const uid = BigInt(req.user.userId);
    await prisma.userLike.upsert({
      where: { userId_videoUuid: { userId: uid, videoUuid: req.params.uuid } },
      create: { userId: uid, videoUuid: req.params.uuid },
      update: {},
    });
    res.json({ liked: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/like/:uuid', protect, async (req, res) => {
  try {
    const uid = BigInt(req.user.userId);
    await prisma.userLike.deleteMany({ where: { userId: uid, videoUuid: req.params.uuid } });
    res.json({ liked: false });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/likes', protect, async (req, res) => {
  try {
    const uid = BigInt(req.user.userId);
    const limit = Math.min(parseInt(req.query.limit) || 48, 100);
    const skip = parseInt(req.query.skip) || 0;
    const likes = await prisma.userLike.findMany({
      where: { userId: uid },
      orderBy: { createdAt: 'desc' },
      skip, take: limit,
    });
    const videos = await Promise.all(likes.map(l => getVideoMeta(l.videoUuid)));
    res.json({ items: videos.filter(Boolean), total: await prisma.userLike.count({ where: { userId: uid } }) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/like-status/:uuid', protect, async (req, res) => {
  try {
    const uid = BigInt(req.user.userId);
    const like = await prisma.userLike.findUnique({ where: { userId_videoUuid: { userId: uid, videoUuid: req.params.uuid } } });
    res.json({ liked: !!like });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── SAVES ────────────────────────────────────────────────────────────────────
router.post('/save/:uuid', protect, async (req, res) => {
  try {
    const uid = BigInt(req.user.userId);
    await prisma.userSave.upsert({
      where: { userId_videoUuid: { userId: uid, videoUuid: req.params.uuid } },
      create: { userId: uid, videoUuid: req.params.uuid },
      update: {},
    });
    res.json({ saved: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/save/:uuid', protect, async (req, res) => {
  try {
    const uid = BigInt(req.user.userId);
    await prisma.userSave.deleteMany({ where: { userId: uid, videoUuid: req.params.uuid } });
    res.json({ saved: false });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/saves', protect, async (req, res) => {
  try {
    const uid = BigInt(req.user.userId);
    const limit = Math.min(parseInt(req.query.limit) || 48, 100);
    const skip = parseInt(req.query.skip) || 0;
    const saves = await prisma.userSave.findMany({
      where: { userId: uid },
      orderBy: { createdAt: 'desc' },
      skip, take: limit,
    });
    const videos = await Promise.all(saves.map(s => getVideoMeta(s.videoUuid)));
    res.json({ items: videos.filter(Boolean), total: await prisma.userSave.count({ where: { userId: uid } }) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/save-status/:uuid', protect, async (req, res) => {
  try {
    const uid = BigInt(req.user.userId);
    const save = await prisma.userSave.findUnique({ where: { userId_videoUuid: { userId: uid, videoUuid: req.params.uuid } } });
    res.json({ saved: !!save });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── WATCH HISTORY ────────────────────────────────────────────────────────────
router.post('/history', protect, async (req, res) => {
  try {
    const uid = BigInt(req.user.userId);
    const { uuid, progressSec = 0, durationSec = 0 } = req.body;
    if (!uuid) return res.status(400).json({ error: 'uuid required' });
    await prisma.watchHistory.upsert({
      where: { userId_videoUuid: { userId: uid, videoUuid: uuid } },
      create: { userId: uid, videoUuid: uuid, progressSec: Math.floor(progressSec), durationSec: Math.floor(durationSec), watchedAt: new Date() },
      update: { progressSec: Math.floor(progressSec), durationSec: Math.floor(durationSec), watchedAt: new Date() },
    });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/history', protect, async (req, res) => {
  try {
    const uid = BigInt(req.user.userId);
    const limit = Math.min(parseInt(req.query.limit) || 48, 100);
    const skip = parseInt(req.query.skip) || 0;
    const rows = await prisma.watchHistory.findMany({
      where: { userId: uid },
      orderBy: { watchedAt: 'desc' },
      skip, take: limit,
    });
    const total = await prisma.watchHistory.count({ where: { userId: uid } });
    const items = await Promise.all(rows.map(async r => {
      const video = await getVideoMeta(r.videoUuid);
      if (!video) return null;
      return { ...video, progressSec: r.progressSec, durationSec: r.durationSec || video.duration, watchedAt: r.watchedAt };
    }));
    res.json({ items: items.filter(Boolean), total });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/history/:uuid', protect, async (req, res) => {
  try {
    const uid = BigInt(req.user.userId);
    await prisma.watchHistory.deleteMany({ where: { userId: uid, videoUuid: req.params.uuid } });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/history', protect, async (req, res) => {
  try {
    const uid = BigInt(req.user.userId);
    await prisma.watchHistory.deleteMany({ where: { userId: uid } });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── COMMENTS ─────────────────────────────────────────────────────────────────
router.post('/comment', async (req, res) => {
  try {
    const { uuid, body, guestName } = req.body;
    if (!uuid || !body?.trim()) return res.status(400).json({ error: 'uuid and body required' });
    const authHeader = req.headers.authorization;
    let userId = null;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const jwt = (await import('jsonwebtoken')).default;
        const decoded = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET || 'super-long-random-secret-key-change-this');
        userId = BigInt(decoded.userId);
      } catch { /* guest comment */ }
    }
    const comment = await prisma.userComment.create({
      data: { userId, videoUuid: uuid, body: body.trim(), guestName: userId ? null : (guestName?.trim() || 'Anonymous') },
    });
    res.json({ id: comment.id.toString(), body: comment.body, guestName: comment.guestName, createdAt: comment.createdAt });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/comments/:uuid', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = parseInt(req.query.skip) || 0;
    const [rows, total] = await Promise.all([
      prisma.userComment.findMany({
        where: { videoUuid: req.params.uuid },
        orderBy: { createdAt: 'desc' },
        skip, take: limit,
        include: { user: { select: { name: true } } },
      }),
      prisma.userComment.count({ where: { videoUuid: req.params.uuid } }),
    ]);
    const items = rows.map(c => ({
      id: c.id.toString(),
      body: c.body,
      authorName: c.user?.name || c.guestName || 'Anonymous',
      isGuest: !c.userId,
      createdAt: c.createdAt,
    }));
    res.json({ items, total });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/my-comments', protect, async (req, res) => {
  try {
    const uid = BigInt(req.user.userId);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = parseInt(req.query.skip) || 0;
    const [rows, total] = await Promise.all([
      prisma.userComment.findMany({ where: { userId: uid }, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.userComment.count({ where: { userId: uid } }),
    ]);
    res.json({ items: rows.map(c => ({ id: c.id.toString(), body: c.body, videoUuid: c.videoUuid, createdAt: c.createdAt })), total });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/comment/:id', protect, async (req, res) => {
  try {
    const uid = BigInt(req.user.userId);
    const comment = await prisma.userComment.findUnique({ where: { id: BigInt(req.params.id) } });
    if (!comment || (comment.userId && comment.userId !== uid && req.user.role !== 'admin')) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    await prisma.userComment.delete({ where: { id: BigInt(req.params.id) } });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── PROFILE UPDATE ───────────────────────────────────────────────────────────
router.patch('/profile', protect, async (req, res) => {
  try {
    const uid = BigInt(req.user.userId);
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name required' });
    const updated = await prisma.user.update({ where: { id: uid }, data: { name: name.trim() } });
    res.json({ id: updated.id.toString(), name: updated.name, email: updated.email, role: updated.role });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── DELETE ALL MY DATA ───────────────────────────────────────────────────────
router.delete('/my-data', protect, async (req, res) => {
  try {
    const uid = BigInt(req.user.userId);
    await Promise.all([
      prisma.userLike.deleteMany({ where: { userId: uid } }),
      prisma.userSave.deleteMany({ where: { userId: uid } }),
      prisma.watchHistory.deleteMany({ where: { userId: uid } }),
      prisma.userComment.updateMany({ where: { userId: uid }, data: { userId: null, guestName: 'Deleted User' } }),
    ]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── RECOMMENDED FEED ─────────────────────────────────────────────────────────
// Algorithm: S(u,v) = w1*Category_match + w2*Trending + w3*Views + w4*NotWatched
router.get('/recommended', protect, async (req, res) => {
  try {
    const uid = BigInt(req.user.userId);
    const limit = Math.min(parseInt(req.query.limit) || 24, 60);

    // Fetch user's history and liked channels for personalization
    const [historyRows, likeRows] = await Promise.all([
      prisma.watchHistory.findMany({ where: { userId: uid }, select: { videoUuid: true }, take: 50 }),
      prisma.userLike.findMany({ where: { userId: uid }, select: { videoUuid: true }, take: 50 }),
    ]);

    const watchedUuids = new Set(historyRows.map(h => h.videoUuid));
    const likedUuids = new Set(likeRows.map(l => l.videoUuid));
    const allEngaged = [...new Set([...watchedUuids, ...likedUuids])];

    // Find liked/watched channels for channel-affinity scoring
    let preferredChannels = [];
    if (allEngaged.length > 0) {
      const engagedVideos = await prisma.video.findMany({
        where: { uuid: { in: allEngaged.slice(0, 30) }, channelName: { not: null } },
        select: { channelName: true },
      });
      const channelCounts = {};
      for (const v of engagedVideos) {
        if (v.channelName) channelCounts[v.channelName] = (channelCounts[v.channelName] || 0) + 1;
      }
      preferredChannels = Object.entries(channelCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([c]) => c);
    }

    // Build candidate pool: active videos not already watched
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const candidates = await prisma.video.findMany({
      where: {
        status: 'active',
        uuid: watchedUuids.size > 0 ? { notIn: [...watchedUuids] } : undefined,
      },
      select: {
        uuid: true, title: true, slug: true, thumbnail: true,
        duration: true, views: true, sourceViews: true,
        channelName: true, channelLogo: true, channelUrl: true,
        createdAt: true,
      },
      orderBy: { views: 'desc' },
      take: 200,
    });

    // Score and sort candidates
    const now = Date.now();
    const scored = candidates.map(v => {
      const w1 = preferredChannels.includes(v.channelName) ? 3.0 : 0;
      const ageDays = (now - new Date(v.createdAt).getTime()) / 86400000;
      const w2 = Math.max(0, 1 - ageDays / 30); // recency bonus
      const w3 = Math.log10((v.views || 1) + 1) / 7; // views normalized
      const score = w1 * 0.4 + w2 * 0.3 + w3 * 0.3;
      return { ...v, score };
    }).sort((a, b) => b.score - a.score);

    res.json({ items: scored.slice(0, limit) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── DASHBOARD SUMMARY ────────────────────────────────────────────────────────
router.get('/dashboard', protect, async (req, res) => {
  try {
    const uid = BigInt(req.user.userId);

    const [historyRows, saveRows, user] = await Promise.all([
      prisma.watchHistory.findMany({ where: { userId: uid }, orderBy: { watchedAt: 'desc' }, take: 20 }),
      prisma.userSave.findMany({ where: { userId: uid }, orderBy: { createdAt: 'desc' }, take: 8 }),
      prisma.user.findUnique({ where: { id: uid }, select: { name: true, email: true, role: true, createdAt: true } }),
    ]);

    const continueWatching = historyRows.filter(r => r.progressSec > 10 && r.durationSec > 0 && r.progressSec < r.durationSec * 0.95);
    const recentlyWatched = historyRows.slice(0, 10);

    const [continueVideos, recentVideos, savedVideos, trending] = await Promise.all([
      Promise.all(continueWatching.slice(0, 6).map(async r => {
        const v = await getVideoMeta(r.videoUuid);
        return v ? { ...v, progressSec: r.progressSec, durationSec: r.durationSec || v.duration } : null;
      })),
      Promise.all(recentlyWatched.map(async r => {
        const v = await getVideoMeta(r.videoUuid);
        return v ? { ...v, watchedAt: r.watchedAt } : null;
      })),
      Promise.all(saveRows.map(s => getVideoMeta(s.videoUuid))),
      prisma.video.findMany({ where: { status: 'active' }, orderBy: { views: 'desc' }, take: 8,
        select: { uuid: true, title: true, slug: true, thumbnail: true, duration: true, views: true, sourceViews: true, channelName: true, channelLogo: true, createdAt: true } }),
    ]);

    res.json({
      user,
      continueWatching: continueVideos.filter(Boolean),
      recentlyWatched: recentVideos.filter(Boolean),
      savedVideos: savedVideos.filter(Boolean),
      trending,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
