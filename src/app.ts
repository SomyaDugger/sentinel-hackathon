import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import logger from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import cameraRoutes from './routes/camera.routes';
import watchlistRoutes from './routes/watchlist.routes';
import trackingRoutes from './routes/tracking.routes';
import alertRoutes from './routes/alert.routes';
import detectionRoutes from './routes/detection.routes';
import reportRoutes from './routes/report.routes';
import streamRoutes, { setSessionCookie, getSessionCookie } from './routes/stream.routes';

dotenv.config();

const app = express();

// ── Auto-create snapshots directory ─────────────────────────
const snapshotsDir = path.join(__dirname, '../snapshots');
if (!fs.existsSync(snapshotsDir)) {
  fs.mkdirSync(snapshotsDir, { recursive: true });
  logger.info(`Created snapshots directory: ${snapshotsDir}`);
}

// ── Core Middleware ──────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Static snapshot serving ─────────────────────────────────
app.use('/snapshots', express.static(snapshotsDir));

// ── Request Logging ─────────────────────────────────────────
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });
  next();
});

// ── Health Check ────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'Sentinel IVMS API is operational',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// ── Dynamic Cookie Update ───────────────────────────────────
app.post('/api/settings/cookie', (req, res) => {
  const { cookie } = req.body;
  if (!cookie || typeof cookie !== 'string' || cookie.trim().length < 10) {
    res.status(400).json({
      success: false,
      error: 'Invalid cookie value. Provide a valid sentinel session cookie.',
    });
    return;
  }

  // Auto-prefix "sentinel=" if the user just pasted the JWT value
  const normalised = cookie.trim().startsWith('sentinel=')
    ? cookie.trim()
    : `sentinel=${cookie.trim()}`;

  setSessionCookie(normalised);
  logger.info('Session cookie updated via /api/settings/cookie');
  res.json({ success: true, message: 'Session cookie updated. Streams will reconnect.' });
});

// ── API Routes ──────────────────────────────────────────────
app.use('/api/cameras', cameraRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/detections', detectionRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/stream', streamRoutes);

// ── Root enc.key fallback (FFmpeg resolves relative to base URL) ─────
app.get('/enc.key', async (_req, res) => {
  const axios = (await import('axios')).default;
  try {
    const resp = await axios.get('https://cctv.corp8.cloud/enc.key', {
      responseType: 'arraybuffer',
      timeout: 10000,
      headers: {
        Cookie: getSessionCookie(),
        'User-Agent': 'Mozilla/5.0',
        Referer: 'https://cctv.corp8.cloud/',
      },
      validateStatus: () => true,
    });
    if (resp.status === 200) {
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(Buffer.from(resp.data as ArrayBuffer));
    } else {
      res.status(resp.status).end();
    }
  } catch {
    res.status(502).end();
  }
});

// ── 404 Handler ─────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { message: 'Endpoint not found' },
  });
});

// ── Global Error Handler ────────────────────────────────────
app.use(errorHandler);

export default app;
