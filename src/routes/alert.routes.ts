import { Router } from 'express';
import { AlertController } from '../controllers/alert.controller';

const router = Router();

router.get('/', AlertController.getAlerts);

export default router;
