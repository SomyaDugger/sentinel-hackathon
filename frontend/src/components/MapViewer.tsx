import { useEffect, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  LayersControl,
  LayerGroup,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import type { Camera, Detection } from '../types';
import HlsPlayer from './HlsPlayer';

// ── Fix Leaflet default icon paths for bundlers ─────────────────────────
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)[
  '_getIconUrl'
];
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// ── Sample video feeds for CCTV simulation ──────────────────────────────
const SAMPLE_FEEDS = [
  'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
];

// ── Department-colored marker icons ─────────────────────────────────────
function createDeptIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="
      background:${color};
      width:28px;height:28px;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      border:2px solid white;
      box-shadow:0 2px 6px rgba(0,0,0,0.4);
      display:flex;align-items:center;justify-content:center;
    "><span style="transform:rotate(45deg);font-size:12px;">📷</span></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
}

const DEPT_ICONS: Record<string, L.DivIcon> = {
  'Home Department': createDeptIcon('#3b82f6'),
  RTO: createDeptIcon('#f59e0b'),
  'Food & Civil Supplies': createDeptIcon('#10b981'),
};
const DEFAULT_ICON = createDeptIcon('#6b7280');

// ── Programmatic map mover ──────────────────────────────────────────────
function MapMover({
  center,
  zoom,
}: {
  center: [number, number];
  zoom: number;
}) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [map, center, zoom]);
  return null;
}

// ── Health status dot color ─────────────────────────────────────────────
function healthColor(status: string) {
  switch (status) {
    case 'Online':
      return 'text-emerald-400';
    case 'Offline':
      return 'text-red-400';
    case 'Degraded':
      return 'text-amber-400';
    default:
      return 'text-slate-400';
  }
}

// ── Props ───────────────────────────────────────────────────────────────
interface MapViewerProps {
  cameras: Camera[];
  trackingRoute: Detection[];
  center: [number, number];
  zoom: number;
}

export default function MapViewer({
  cameras,
  trackingRoute,
  center,
  zoom,
}: MapViewerProps) {
  // Group cameras by department for layer controls
  const deptGroups = useMemo(() => {
    const groups: Record<string, Camera[]> = {};
    cameras.forEach((cam) => {
      const dept = cam.department_name;
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push(cam);
    });
    return groups;
  }, [cameras]);

  // Route polyline coordinates
  const routeCoords = useMemo(
    () =>
      trackingRoute
        .filter((d) => d.camera?.coordinates)
        .map(
          (d) =>
            [
              d.camera!.coordinates!.latitude,
              d.camera!.coordinates!.longitude,
            ] as [number, number]
        ),
    [trackingRoute]
  );

  return (
    <MapContainer
      center={[22.2587, 71.1924]}
      zoom={7}
      className="h-full w-full"
      zoomControl={false}
    >
      <MapMover center={center} zoom={zoom} />

      {/* OSM tiles with CSS invert for dark mode — no API key needed */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        className="dark-map-tiles"
      />

      {/* Layer controls grouped by department */}
      <LayersControl position="topright">
        {Object.entries(deptGroups).map(([dept, cams]) => (
          <LayersControl.Overlay key={dept} checked name={dept}>
            <LayerGroup>
              {cams.map((cam) => {
                if (!cam.location) return null;
                const [lng, lat] = cam.location.coordinates;
                const feedUrl =
                  SAMPLE_FEEDS[
                    cam.id.charCodeAt(0) % SAMPLE_FEEDS.length
                  ];
                return (
                  <Marker
                    key={cam.id}
                    position={[lat, lng]}
                    icon={DEPT_ICONS[dept] || DEFAULT_ICON}
                  >
                    <Popup minWidth={280} maxWidth={320}>
                      <div className="bg-slate-800 text-slate-100 p-3 rounded-lg min-w-[270px]">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-sm">
                            {cam.landmark}
                          </span>
                          <span
                            className={`text-xs font-medium ${healthColor(cam.health_status)}`}
                          >
                            ● {cam.health_status}
                          </span>
                        </div>

                        {/* Details */}
                        <div className="space-y-1 text-xs text-slate-300">
                          <p>
                            📍 {cam.district}, {cam.city_or_taluka}
                          </p>
                          <p>🏢 {cam.department_name}</p>
                          <p>
                            🔧 {cam.vms_vendor} · {cam.camera_type}
                          </p>
                          <p>
                            📹 {cam.resolution} · {cam.retention_days}d
                            retention
                          </p>
                        </div>

                        {/* ── Live CCTV Feed ──────────────────── */}
                        <div className="mt-3 bg-black rounded-lg overflow-hidden relative">
                          {cam.camera_code ? (
                            <HlsPlayer
                              src={`/api/stream/${cam.camera_code}/index.m3u8`}
                              cameraCode={cam.camera_code}
                              cameraName={cam.landmark}
                              className="w-full h-32"
                            />
                          ) : (
                            <div className="cctv-scanlines relative">
                              <video
                                autoPlay
                                loop
                                muted
                                playsInline
                                className="w-full h-32 object-cover"
                                src={feedUrl}
                              />
                              <div className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded font-bold shadow">
                                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                                LIVE
                              </div>
                              <div className="absolute top-1.5 right-1.5 text-[9px] text-white/80 font-mono bg-black/60 px-1.5 py-0.5 rounded">
                                CAM-{cam.id.substring(0, 8).toUpperCase()}
                              </div>
                              <div className="absolute bottom-1.5 left-1.5 text-[9px] text-green-400/90 font-mono bg-black/60 px-1.5 py-0.5 rounded">
                                {new Date().toLocaleString()}
                              </div>
                              <div className="absolute bottom-1.5 right-1.5 text-[9px] text-white/70 font-mono bg-black/60 px-1.5 py-0.5 rounded">
                                {cam.resolution}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </LayerGroup>
          </LayersControl.Overlay>
        ))}
      </LayersControl>

      {/* Vehicle tracking route polyline */}
      {routeCoords.length > 1 && (
        <Polyline
          positions={routeCoords}
          pathOptions={{
            color: '#ef4444',
            weight: 3,
            dashArray: '10, 6',
            opacity: 0.85,
          }}
        />
      )}

      {/* Numbered detection markers along the route */}
      {trackingRoute.map((det, idx) => {
        if (!det.camera?.coordinates) return null;
        return (
          <Marker
            key={det.detection_id}
            position={[
              det.camera.coordinates.latitude,
              det.camera.coordinates.longitude,
            ]}
            icon={L.divIcon({
              className: '',
              html: `<div style="
                background:#ef4444;color:white;
                width:24px;height:24px;border-radius:50%;
                display:flex;align-items:center;justify-content:center;
                font-size:11px;font-weight:bold;
                border:2px solid white;
                box-shadow:0 2px 4px rgba(0,0,0,0.5);
              ">${idx + 1}</div>`,
              iconSize: [24, 24],
              iconAnchor: [12, 12],
            })}
          >
            <Popup>
              <div className="bg-slate-800 text-slate-100 p-3 rounded-lg min-w-[200px]">
                <p className="font-semibold text-sm">Stop #{idx + 1}</p>
                <p className="text-xs text-slate-300 mt-1">
                  {det.camera.landmark}
                </p>
                <p className="text-xs text-slate-400">{det.camera.district}</p>
                <p className="text-xs text-emerald-400 mt-1.5">
                  {(det.confidence * 100).toFixed(0)}% confidence
                </p>
                <p className="text-xs text-slate-500">
                  {new Date(det.detected_at).toLocaleString()}
                </p>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
