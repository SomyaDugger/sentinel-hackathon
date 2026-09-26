import { Request, Response, NextFunction } from 'express';
import { Detection, Camera } from '../models';
import { Op } from 'sequelize';
import logger from '../utils/logger';
import { ApiError } from '../middleware/errorHandler';

export class TrackingController {
  /**
   * GET /api/tracking/:license_plate
   * Returns chronologically ordered detections with camera coordinates
   * for vehicle route reconstruction.
   */
  static async getVehicleRoute(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { license_plate } = req.params;
      const { from, to } = req.query;

      if (!license_plate) {
        throw new ApiError(400, 'license_plate parameter is required');
      }

      const where: any = { license_plate: license_plate.toUpperCase() };

      // Optional date range filter
      if (from || to) {
        where.detected_at = {};
        if (from) where.detected_at[Op.gte] = new Date(from as string);
        if (to) where.detected_at[Op.lte] = new Date(to as string);
      }

      const detections = await Detection.findAll({
        where,
        include: [
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
        ],
        order: [['detected_at', 'ASC']],
      });

      logger.info(
        `Route query for ${license_plate}: ${detections.length} detections found`
      );

      // Build route coordinates array for mapping
      const route = detections.map((d: any) => ({
        detection_id: d.id,
        license_plate: d.license_plate,
        confidence: d.confidence,
        snapshot_url: d.snapshot_url,
        detected_at: d.detected_at,
        is_watchlist_match: d.is_watchlist_match,
        alert_status: d.alert_status,
        camera: d.camera
          ? {
              id: d.camera.id,
              district: d.camera.district,
              city_or_taluka: d.camera.city_or_taluka,
              landmark: d.camera.landmark,
              camera_type: d.camera.camera_type,
              coordinates: d.camera.location
                ? {
                    latitude: d.camera.location.coordinates[1],
                    longitude: d.camera.location.coordinates[0],
                  }
                : null,
            }
          : null,
      }));

      res.json({
        success: true,
        license_plate: license_plate.toUpperCase(),
        total_detections: route.length,
        route,
      });
    } catch (error) {
      next(error);
    }
  }
}
