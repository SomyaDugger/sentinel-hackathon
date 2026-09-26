import { Router } from 'express';
import { CameraController } from '../controllers/camera.controller';
import { upload } from '../middleware/upload';

const router = Router();

router.post('/onboard', CameraController.onboard);
router.post('/bulk-upload', upload.single('file'), CameraController.bulkUpload);
router.get('/', CameraController.getAll);

export default router;
