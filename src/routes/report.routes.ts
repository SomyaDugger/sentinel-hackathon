import { Router } from 'express';
import { getDetectionsCsv } from '../controllers/report.controller';

const router = Router();

// GET /api/reports/detections-csv — downloadable CSV report
router.get('/detections-csv', getDetectionsCsv);

export default router;
