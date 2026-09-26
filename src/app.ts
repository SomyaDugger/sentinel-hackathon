import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import logger from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import cameraRoutes from './routes/camera.routes';
import watchlistRoutes from './routes/watchlist.routes';
import trackingRoutes from './routes/tracking.routes';
import alertRoutes from './routes/alert.routes';

dotenv.config();

const app = express();

// ── Core Middleware ──────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// ── API Routes ──────────────────────────────────────────────
app.use('/api/cameras', cameraRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/alerts', alertRoutes);

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
