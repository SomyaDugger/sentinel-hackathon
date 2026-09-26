import { Router } from 'express';
import { TrackingController } from '../controllers/tracking.controller';

const router = Router();

router.get('/:license_plate', TrackingController.getVehicleRoute);

export default router;
