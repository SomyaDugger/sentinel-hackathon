import { Router } from 'express';
import {
  ingestDetection,
  acknowledgeDetection,
} from '../controllers/detection.controller';

const router = Router();

// POST /api/detections — ingest a new ANPR detection
router.post('/', ingestDetection);

// PATCH /api/detections/:id/acknowledge — operator acknowledges alert
router.patch('/:id/acknowledge', acknowledgeDetection);

export default router;
