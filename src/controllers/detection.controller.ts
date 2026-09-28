import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Detection, Watchlist, Camera } from '../models';
import logger from '../utils/logger';

/**
 * POST /api/detections
 * Ingest a detection from ANPR engine, auto-match against watchlist.
 */
export const ingestDetection = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { camera_id, license_plate, confidence, snapshot_url } = req.body;

    // ── Validation ──────────────────────────────────────────────
    if (!camera_id || !license_plate || confidence === undefined) {
      res.status(400).json({
        success: false,
        error: {
          message:
            'Required fields: camera_id, license_plate, confidence',
        },
      });
      return;
    }

    // ── Normalize license plate ─────────────────────────────────
    const normalizedPlate = license_plate
      .replace(/[\s\-\.]/g, '')
      .toUpperCase();

    // ── Verify camera exists ────────────────────────────────────
    const camera = await Camera.findByPk(camera_id);
    if (!camera) {
      res.status(404).json({
        success: false,
        error: { message: `Camera ${camera_id} not found` },
      });
      return;
    }

    // ── Cross-reference watchlist ────────────────────────────────
    const watchlistMatch = await Watchlist.findOne({
      where: { license_plate: normalizedPlate },
    });

    // ── Create detection record ─────────────────────────────────
    const detection = await Detection.create({
      id: uuidv4(),
      camera_id,
      license_plate: normalizedPlate,
      confidence: parseFloat(confidence),
      snapshot_url: snapshot_url || `/snapshots/det_${Date.now()}.jpg`,
      detected_at: new Date(),
      is_watchlist_match: !!watchlistMatch,
      watchlist_id: watchlistMatch ? watchlistMatch.id : null,
      alert_status: 'New',
    });

    // ── Build response ──────────────────────────────────────────
    const responseData: Record<string, unknown> = {
      success: true,
      data: {
        detection_id: detection.id,
        license_plate: normalizedPlate,
        confidence: detection.confidence,
        is_watchlist_match: !!watchlistMatch,
        alert_status: detection.alert_status,
        camera_id,
        camera_landmark: camera.getDataValue('landmark'),
        camera_district: camera.getDataValue('district'),
        detected_at: detection.detected_at,
      },
    };

    if (watchlistMatch) {
      (responseData.data as Record<string, unknown>).watchlist = {
        id: watchlistMatch.id,
        entity_type: watchlistMatch.getDataValue('entity_type'),
        alert_priority: watchlistMatch.getDataValue('alert_priority'),
        source_database: watchlistMatch.getDataValue('source_database'),
        case_reference: watchlistMatch.getDataValue('case_reference'),
      };
      logger.warn(
        `🚨 WATCHLIST MATCH: ${normalizedPlate} → ` +
          `${watchlistMatch.getDataValue('entity_type')} ` +
          `(${watchlistMatch.getDataValue('alert_priority')}) ` +
          `at ${camera.getDataValue('landmark')}, ${camera.getDataValue('district')}`
      );
    } else {
      logger.info(
        `Detection recorded: ${normalizedPlate} at ${camera.getDataValue('landmark')} (no match)`
      );
    }

    res.status(201).json(responseData);
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/detections/:id/acknowledge
 * Mark a detection alert as acknowledged by an operator.
 */
export const acknowledgeDetection = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const detection = await Detection.findByPk(id);
    if (!detection) {
      res.status(404).json({
        success: false,
        error: { message: 'Detection not found' },
      });
      return;
    }
    detection.alert_status = 'Acknowledged';
    await detection.save();

    logger.info(`Detection ${id} acknowledged (${detection.license_plate})`);
    res.json({
      success: true,
      data: {
        id,
        license_plate: detection.license_plate,
        alert_status: 'Acknowledged',
      },
    });
  } catch (error) {
    next(error);
  }
};
