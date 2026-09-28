import { Request, Response, NextFunction } from 'express';
import { Detection, Camera, Watchlist } from '../models';
import logger from '../utils/logger';

/**
 * GET /api/reports/detections-csv
 * Export all detections as a downloadable CSV with camera + watchlist details.
 */
export const getDetectionsCsv = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const detections = await Detection.findAll({
      include: [
        {
          model: Camera,
          as: 'camera',
          attributes: ['landmark', 'district', 'department_name', 'vms_vendor'],
        },
        {
          model: Watchlist,
          as: 'watchlist',
          attributes: ['alert_priority', 'source_database'],
          required: false,
        },
      ],
      order: [['detected_at', 'DESC']],
    });

    // ── CSV headers ─────────────────────────────────────────────
    const headers = [
      'Timestamp',
      'License Plate',
      'Match Status',
      'Priority',
      'Watchlist Source',
      'Camera Landmark',
      'District',
      'Department',
      'Confidence',
    ];

    // ── CSV rows ────────────────────────────────────────────────
    const escapeCell = (val: string | number | null | undefined): string => {
      const s = String(val ?? '');
      return `"${s.replace(/"/g, '""')}"`;
    };

    const rows = detections.map((det) => {
      const cam = det.camera;
      const wl = det.watchlist;
      return [
        det.detected_at ? new Date(det.detected_at).toISOString() : '',
        det.license_plate,
        det.is_watchlist_match ? 'MATCH' : 'No Match',
        wl?.getDataValue('alert_priority') ?? 'N/A',
        wl?.getDataValue('source_database') ?? 'N/A',
        cam?.getDataValue('landmark') ?? 'Unknown',
        cam?.getDataValue('district') ?? 'Unknown',
        cam?.getDataValue('department_name') ?? 'Unknown',
        det.confidence,
      ]
        .map(escapeCell)
        .join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');

    logger.info(`CSV report generated: ${detections.length} detections`);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="sentinel_detections_${new Date().toISOString().slice(0, 10)}.csv"`
    );
    res.send(csv);
  } catch (error) {
    next(error);
  }
};
