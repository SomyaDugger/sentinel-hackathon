import { Request, Response, NextFunction } from 'express';
import { Camera } from '../models';
import { Sequelize } from 'sequelize';
import fs from 'fs';
import csvParser from 'csv-parser';
import logger from '../utils/logger';
import { ApiError } from '../middleware/errorHandler';

export class CameraController {
  /**
   * POST /api/cameras/onboard
   * Create a single camera via JSON body.
   */
  static async onboard(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        department_name,
        district,
        city_or_taluka,
        landmark,
        camera_type,
        status,
        rtsp_url,
        vms_vendor,
        retention_days,
        resolution,
        health_status,
        latitude,
        longitude,
      } = req.body;

      if (
        !department_name ||
        !district ||
        !city_or_taluka ||
        !camera_type ||
        !rtsp_url ||
        !vms_vendor
      ) {
        throw new ApiError(
          400,
          'Missing required fields: department_name, district, city_or_taluka, camera_type, rtsp_url, vms_vendor'
        );
      }

      const location =
        latitude && longitude
          ? {
              type: 'Point' as const,
              coordinates: [parseFloat(longitude), parseFloat(latitude)],
            }
          : null;

      const camera = await Camera.create({
        department_name,
        district,
        city_or_taluka,
        landmark: landmark || '',
        camera_type,
        status: status || 'Active',
        rtsp_url,
        vms_vendor,
        retention_days: retention_days || 15,
        resolution: resolution || '1080p',
        health_status: health_status || 'Online',
        location,
      });

      logger.info(
        `Camera onboarded: ${camera.id} at ${district}, ${city_or_taluka}`
      );

      res.status(201).json({
        success: true,
        data: camera,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/cameras/bulk-upload
   * Upload a CSV file to bulk-create camera records.
   */
  static async bulkUpload(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.file) {
        throw new ApiError(400, 'No CSV file uploaded');
      }

      const cameras: any[] = [];
      const errors: { row: number; message: string }[] = [];
      let rowNumber = 0;

      await new Promise<void>((resolve, reject) => {
        fs.createReadStream(req.file!.path)
          .pipe(csvParser())
          .on('data', (row: any) => {
            rowNumber++;
            try {
              const location =
                row.latitude && row.longitude
                  ? {
                      type: 'Point' as const,
                      coordinates: [
                        parseFloat(row.longitude),
                        parseFloat(row.latitude),
                      ],
                    }
                  : null;

              cameras.push({
                department_name: row.department_name,
                district: row.district,
                city_or_taluka: row.city_or_taluka,
                landmark: row.landmark || '',
                camera_type: row.camera_type,
                status: row.status || 'Active',
                rtsp_url: row.rtsp_url,
                vms_vendor: row.vms_vendor,
                retention_days: parseInt(row.retention_days, 10) || 15,
                resolution: row.resolution || '1080p',
                health_status: row.health_status || 'Online',
                location,
              });
            } catch (err: any) {
              errors.push({ row: rowNumber, message: err.message });
            }
          })
          .on('end', resolve)
          .on('error', reject);
      });

      // Clean up uploaded file
      fs.unlinkSync(req.file.path);

      if (cameras.length === 0) {
        throw new ApiError(400, 'No valid camera records found in CSV');
      }

      const created = await Camera.bulkCreate(cameras, { validate: true });

      logger.info(
        `Bulk upload complete: ${created.length} cameras onboarded, ${errors.length} errors`
      );

      res.status(201).json({
        success: true,
        data: {
          total_processed: rowNumber,
          successfully_created: created.length,
          errors,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/cameras
   * Returns all cameras with optional spatial filtering:
   *  - Bounding box: ?bbox=minLng,minLat,maxLng,maxLat
   *  - Radius:       ?lat=...&lng=...&radius=... (meters)
   */
  static async getAll(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { bbox, lat, lng, radius, district, status, camera_type } =
        req.query;
      const where: any = {};

      // Attribute filters
      if (district) where.district = district;
      if (status) where.status = status;
      if (camera_type) where.camera_type = camera_type;

      // Spatial filter: bounding box
      if (bbox) {
        const coords = (bbox as string).split(',').map(Number);
        if (coords.length !== 4 || coords.some(isNaN)) {
          throw new ApiError(
            400,
            'bbox must be: minLng,minLat,maxLng,maxLat'
          );
        }
        const [minLng, minLat, maxLng, maxLat] = coords;
        where.location = Sequelize.where(
          Sequelize.fn(
            'ST_Within',
            Sequelize.col('location'),
            Sequelize.fn(
              'ST_MakeEnvelope',
              minLng,
              minLat,
              maxLng,
              maxLat,
              4326
            )
          ),
          true
        );
      }

      // Spatial filter: radius (in meters)
      if (lat && lng && radius) {
        const latNum = parseFloat(lat as string);
        const lngNum = parseFloat(lng as string);
        const radiusNum = parseFloat(radius as string);

        if (isNaN(latNum) || isNaN(lngNum) || isNaN(radiusNum)) {
          throw new ApiError(
            400,
            'lat, lng, and radius must be valid numbers'
          );
        }

        where.location = Sequelize.where(
          Sequelize.fn(
            'ST_DWithin',
            Sequelize.cast(Sequelize.col('location'), 'geography'),
            Sequelize.fn(
              'ST_SetSRID',
              Sequelize.fn('ST_MakePoint', lngNum, latNum),
              4326
            ),
            radiusNum
          ),
          true
        );
      }

      const cameras = await Camera.findAll({
        where,
        order: [['created_at', 'DESC']],
      });

      res.json({
        success: true,
        count: cameras.length,
        data: cameras,
      });
    } catch (error) {
      next(error);
    }
  }
}
