import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import videosRouter from './routes/videos.js';
import adminRouter from './routes/admin.js';
import authRouter from './routes/auth.js';
import userRouter from './routes/user.js';
import { protect, adminOnly } from './middleware/auth.js';
import { startRefreshJob } from './jobs/refreshJob.js';
import {
  generalLimiter,
  authLimiter,
  scrapeLimiter,
  streamLimiter,
} from './middleware/rateLimit.js';

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// General rate limiting
app.use(generalLimiter);

// Specific rate limiters
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);

app.use('/api/admin/scrape', scrapeLimiter);
app.use('/api/admin/scrape/listing', scrapeLimiter);
app.use('/api/user/scrape', scrapeLimiter);

app.use('/api/videos/uuid', streamLimiter);

app.use('/api/videos', videosRouter);
app.use('/api/play', (req, res, next) => {
  req.url = '/play' + req.url;
  videosRouter(req, res, next);
});
app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/admin', protect, adminOnly, adminRouter);

// WordPress Plugin / VOD Proxy compatibility route
app.get('/api/media', async (req, res) => {
  try {
    const { action, uuid } = req.query;
    if (!uuid) return res.status(400).json({ success: false, error: 'uuid required' });

    const { default: prisma } = await import('./utils/prisma.js');
    const video = await prisma.video.findUnique({
      where: { uuid: String(uuid) },
    });

    if (!video || video.status !== 'active') {
      return res.status(404).json({ success: false, error: 'Video not found or inactive' });
    }

    if (action === 'get_thumb') {
      return res.json({
        success: true,
        thumbnail: video.thumbnail || '',
        title: video.title,
        duration: video.duration,
      });
    }

    const workerUrl = (process.env.WORKER_PUBLIC_URL || process.env.NEXT_PUBLIC_WORKER_URL || 'http://localhost:8787').replace(/\/$/, '');
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');

    const streamUrl = `${workerUrl}/api/media?uuid=${video.uuid}`;
    const watchUrl = `${frontendUrl}/watch/${video.slug}`;

    const playerHtml = `<iframe src="${watchUrl}" style="width:100%; aspect-ratio:16/9; border:0; border-radius:12px;" allow="autoplay; fullscreen" allowfullscreen></iframe>`;

    res.json({
      success: true,
      uuid: video.uuid,
      title: video.title,
      stream_url: streamUrl,
      watch_url: watchUrl,
      player_html: playerHtml,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`API running on http://localhost:${PORT}`);
    startRefreshJob();
  });
}

export default app;
