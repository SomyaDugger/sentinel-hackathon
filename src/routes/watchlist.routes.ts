import { Router } from 'express';
import { WatchlistController } from '../controllers/watchlist.controller';

const router = Router();

router.post('/', WatchlistController.create);
router.get('/', WatchlistController.getAll);

export default router;
