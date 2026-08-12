import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import videosRouter from './routes/videos.js';
import adminRouter from './routes/admin.js';

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/videos', videosRouter);
app.use('/api/admin', adminRouter);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
