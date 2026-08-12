import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import videosRouter from './routes/videos.js';
import adminRouter from './routes/admin.js';
import authRouter from './routes/auth.js';
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

app.use('/api/videos/uuid', streamLimiter);

app.use('/api/videos', videosRouter);
app.use('/api/auth', authRouter);
app.use('/api/admin', protect, adminOnly, adminRouter);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
  startRefreshJob();
});
