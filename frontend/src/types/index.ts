// ── Camera ───────────────────────────────────────────────────────────────
export interface Camera {
  id: string;
  camera_code: string | null;
  department_name: string;
  district: string;
  city_or_taluka: string;
  landmark: string;
  camera_type: 'ANPR' | 'PTZ' | 'Fixed Bullet' | 'Dome' | 'Analog-Encoder';
  status: 'Active' | 'Inactive';
  rtsp_url: string;
  vms_vendor: string;
  retention_days: number;
  resolution: string;
  health_status: 'Online' | 'Offline' | 'Degraded';
  location: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  } | null;
  created_at: string;
  updated_at: string;
}

// ── Watchlist ────────────────────────────────────────────────────────────
export interface WatchlistEntry {
  id: string;
  license_plate: string;
  entity_type: string;
  alert_priority: 'Low' | 'Medium' | 'High' | 'Critical';
  source_database: 'eGujCop' | 'VAHAN' | 'SARTHI' | 'AFIS/NAFIS' | 'Custom';
  vehicle_make_model: string | null;
  case_reference: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ── Detection (from /api/tracking) ──────────────────────────────────────
export interface Detection {
  detection_id: string;
  license_plate: string;
  confidence: number;
  snapshot_url: string;
  detected_at: string;
  is_watchlist_match: boolean;
  alert_status: 'New' | 'Acknowledged' | 'Resolved';
  camera: {
    id: string;
    district: string;
    city_or_taluka: string;
    landmark: string;
    camera_type: string;
    coordinates: {
      latitude: number;
      longitude: number;
    } | null;
  } | null;
}

// ── Alert (from /api/alerts) ────────────────────────────────────────────
export interface AlertEntry {
  id: string;
  camera_id: string;
  license_plate: string;
  confidence: number;
  snapshot_url: string;
  detected_at: string;
  is_watchlist_match: boolean;
  watchlist_id: string;
  alert_status: string;
  camera: {
    id: string;
    district: string;
    city_or_taluka: string;
    landmark: string;
    location: { type: 'Point'; coordinates: [number, number] } | null;
    camera_type: string;
  };
  watchlist: {
    id: string;
    license_plate: string;
    entity_type: string;
    alert_priority: string;
    source_database: string;
    case_reference: string;
  };
}

// ── API response wrappers ───────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  count?: number;
}

export interface TrackingResponse {
  success: boolean;
  license_plate: string;
  total_detections: number;
  route: Detection[];
}

export interface BulkUploadResult {
  total_processed: number;
  successfully_created: number;
  errors: { row: number; message: string }[];
}
