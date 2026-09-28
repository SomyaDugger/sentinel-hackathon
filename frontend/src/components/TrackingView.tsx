import { useState } from 'react';
import { Search, X, Navigation, Clock, Download } from 'lucide-react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import { fetchTracking } from '../api/client';
import type { Camera, Detection } from '../types';
import { useEffect } from 'react';

const QUICK_PLATES = ['GJ01AB1234', 'GJ06GH3456', 'GJ05CD5678'];

function MapMover({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [map, center, zoom]);
  return null;
}

interface TrackingViewProps {
  cameras: Camera[];
  onViewEvidence?: (det: Detection) => void;
}

export default function TrackingView({ cameras, onViewEvidence }: TrackingViewProps) {
  const [plate, setPlate] = useState('');
  const [loading, setLoading] = useState(false);
  const [route, setRoute] = useState<Detection[]>([]);
  const [activePlate, setActivePlate] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([22.2587, 71.1924]);
  const [mapZoom, setMapZoom] = useState(7);

  const search = async (searchPlate: string) => {
    if (!searchPlate.trim()) return;
    setLoading(true);
    try {
      const data = await fetchTracking(searchPlate.trim().toUpperCase());
      if (data.success && data.route) {
        setRoute(data.route);
        setActivePlate(data.license_plate);
        if (data.route.length > 0 && data.route[0].camera?.coordinates) {
          setMapCenter([
            data.route[0].camera.coordinates.latitude,
            data.route[0].camera.coordinates.longitude,
          ]);
          setMapZoom(9);
        }
      }
    } catch (err) {
      console.error('Tracking failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setRoute([]);
    setActivePlate(null);
    setPlate('');
    setMapCenter([22.2587, 71.1924]);
    setMapZoom(7);
  };

  const routeCoords = route
    .filter((d) => d.camera?.coordinates)
    .map(
      (d) =>
        [d.camera!.coordinates!.latitude, d.camera!.coordinates!.longitude] as [
          number,
          number,
        ]
    );

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-900">
      {/* Search header */}
      <div className="px-6 py-4 border-b border-slate-700 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Navigation className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-bold">Vehicle Movement Analysis</h2>
          </div>
          <button
            onClick={() => window.open('/api/reports/detections-csv', '_blank')}
            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" /> Export Report (CSV)
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-slate-500 shrink-0" />
            <input
              value={plate}
              onChange={(e) => setPlate(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && search(plate)}
              placeholder="Enter vehicle registration number…"
              className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none font-mono"
            />
          </div>
          <button
            onClick={() => search(plate)}
            disabled={loading || !plate.trim()}
            className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Searching…' : 'Track'}
          </button>
          {activePlate && (
            <button
              onClick={clear}
              className="bg-slate-700 hover:bg-slate-600 p-2 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex gap-2 mt-2">
          {QUICK_PLATES.map((qp) => (
            <button
              key={qp}
              onClick={() => { setPlate(qp); search(qp); }}
              className={`px-3 py-1 rounded-full text-xs font-mono transition-colors ${
                activePlate === qp
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {qp}
            </button>
          ))}
        </div>
      </div>

      {/* Map + Timeline split */}
      <div className="flex-1 flex overflow-hidden">
        {/* Map */}
        <div className="flex-1 relative">
          <MapContainer
            center={[22.2587, 71.1924]}
            zoom={7}
            className="h-full w-full"
            zoomControl={false}
          >
            <MapMover center={mapCenter} zoom={mapZoom} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              className="dark-map-tiles"
            />

            {/* Camera markers (faded) */}
            {cameras.map((cam) => {
              if (!cam.location) return null;
              const [lng, lat] = cam.location.coordinates;
              return (
                <Marker
                  key={cam.id}
                  position={[lat, lng]}
                  opacity={0.3}
                />
              );
            })}

            {/* Route polyline */}
            {routeCoords.length > 1 && (
              <Polyline
                positions={routeCoords}
                pathOptions={{ color: '#ef4444', weight: 4, dashArray: '10, 6' }}
              />
            )}

            {/* Detection markers */}
            {route.map((det, idx) => {
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
                      width:28px;height:28px;border-radius:50%;
                      display:flex;align-items:center;justify-content:center;
                      font-size:12px;font-weight:bold;
                      border:2px solid white;
                      box-shadow:0 2px 6px rgba(0,0,0,0.5);
                    ">${idx + 1}</div>`,
                    iconSize: [28, 28],
                    iconAnchor: [14, 14],
                  })}
                >
                  <Popup>
                    <div className="bg-slate-800 text-slate-100 p-3 rounded-lg min-w-[180px]">
                      <p className="font-semibold">Stop #{idx + 1}</p>
                      <p className="text-xs text-slate-300 mt-1">
                        {det.camera.landmark}
                      </p>
                      <p className="text-xs text-slate-400">
                        {det.camera.district}
                      </p>
                      <p className="text-xs text-emerald-400 mt-1">
                        {(det.confidence * 100).toFixed(0)}% confidence
                      </p>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        {/* Timeline sidebar */}
        <div className="w-80 bg-slate-800 border-l border-slate-700 flex flex-col shrink-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700 flex items-center gap-2 shrink-0">
            <Clock className="w-4 h-4 text-red-400" />
            <span className="text-sm font-semibold">
              {activePlate ? (
                <>
                  Route: <span className="font-mono text-red-400">{activePlate}</span>
                </>
              ) : (
                'Detection Timeline'
              )}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {route.length === 0 ? (
              <div className="text-center text-slate-500 text-sm py-8">
                Enter a license plate to view its route across Gujarat
              </div>
            ) : (
              route.map((det, idx) => {
                const hasSnap = det.snapshot_url && !det.snapshot_url.startsWith('/snapshots/det_');
                return (
                <div
                  key={det.detection_id}
                  className="bg-slate-900 rounded-lg p-3 border border-slate-700 hover:border-red-500/50 transition-colors cursor-pointer"
                  onClick={() => onViewEvidence?.(det)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-red-500 text-white text-xs font-bold w-7 h-7 rounded-full flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-200">
                        {det.camera?.landmark || 'Unknown'}
                      </p>
                      <p className="text-xs text-slate-400">
                        {det.camera?.district}
                        {det.camera?.city_or_taluka
                          ? `, ${det.camera.city_or_taluka}`
                          : ''}
                      </p>
                    </div>
                    {hasSnap && (
                      <div className="shrink-0 w-12 h-9 rounded overflow-hidden border border-slate-600">
                        <img src={det.snapshot_url} alt="ANPR" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      {new Date(det.detected_at).toLocaleString()}
                    </span>
                    <span
                      className={`font-medium ${
                        det.confidence >= 0.9
                          ? 'text-emerald-400'
                          : det.confidence >= 0.8
                            ? 'text-amber-400'
                            : 'text-red-400'
                      }`}
                    >
                      {(det.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {det.camera?.camera_type} ·{' '}
                    {det.is_watchlist_match ? '🚨 Watchlist Match' : 'No Match'}
                    {hasSnap && <span className="ml-2 text-blue-400">📸 Evidence</span>}
                  </div>
                </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
