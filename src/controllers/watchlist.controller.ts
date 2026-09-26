import { Request, Response, NextFunction } from 'express';
import { Watchlist } from '../models';
import logger from '../utils/logger';
import { ApiError } from '../middleware/errorHandler';

export class WatchlistController {
  /**
   * POST /api/watchlist
   * Create a single watchlist entry.
   */
  static async create(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        license_plate,
        entity_type,
        alert_priority,
        source_database,
        vehicle_make_model,
        case_reference,
        notes,
      } = req.body;

      if (!license_plate || !entity_type || !alert_priority) {
        throw new ApiError(
          400,
          'Missing required fields: license_plate, entity_type, alert_priority'
        );
      }

      const entry = await Watchlist.create({
        license_plate: license_plate.toUpperCase(),
        entity_type,
        alert_priority,
        source_database: source_database || 'eGujCop',
        vehicle_make_model: vehicle_make_model || null,
        case_reference: case_reference || null,
        notes: notes || null,
      });

      logger.info(
        `Watchlist entry created: ${entry.license_plate} [${entry.alert_priority}]`
      );

      res.status(201).json({
        success: true,
        data: entry,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/watchlist
   * List all watchlist entries, filterable by priority and source.
   */
  static async getAll(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { priority, source } = req.query;
      const where: any = {};

      if (priority) where.alert_priority = priority;
      if (source) where.source_database = source;

      const entries = await Watchlist.findAll({
        where,
        order: [['created_at', 'DESC']],
      });

      res.json({
        success: true,
        count: entries.length,
        data: entries,
      });
    } catch (error) {
      next(error);
    }
  }
}
