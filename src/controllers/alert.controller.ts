import { Request, Response, NextFunction } from 'express';
import { Detection, Camera, Watchlist } from '../models';
import logger from '../utils/logger';

export class AlertController {
  /**
   * GET /api/alerts
   * Returns detections where is_watchlist_match = true.
   * Filterable by priority and alert_status.
   */
  static async getAlerts(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { priority, status, limit } = req.query;

      const include: any[] = [
        {
          model: Camera,
          as: 'camera',
          attributes: [
            'id',
            'district',
            'city_or_taluka',
            'landmark',
            'location',
            'camera_type',
          ],
        },
        {
          model: Watchlist,
          as: 'watchlist',
          attributes: [
            'id',
            'license_plate',
            'entity_type',
            'alert_priority',
            'source_database',
            'case_reference',
          ],
          ...(priority ? { where: { alert_priority: priority } } : {}),
        },
      ];

      const where: any = { is_watchlist_match: true };
      if (status) where.alert_status = status;

      const alerts = await Detection.findAll({
        where,
        include,
        order: [['detected_at', 'DESC']],
        limit: limit ? parseInt(limit as string, 10) : 100,
      });

      res.json({
        success: true,
        count: alerts.length,
        data: alerts,
      });
    } catch (error) {
      next(error);
    }
  }
}
