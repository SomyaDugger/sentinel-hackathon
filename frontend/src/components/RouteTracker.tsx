import { useState } from 'react';
import { Search, X, Navigation, Clock } from 'lucide-react';
import { fetchTracking } from '../api/client';
import type { Detection } from '../types';

interface RouteTrackerProps {
  onRouteLoaded: (route: Detection[]) => void;
  onClear: () => void;
}

const QUICK_PLATES = ['GJ01AB1234', 'GJ06GH3456', 'GJ05CD5678'];

export default function RouteTracker({ onRouteLoaded, onClear }: RouteTrackerProps) {
  const [plate, setPlate] = useState('');
  const [loading, setLoading] = useState(false);
  const [route, setRoute] = useState<Detection[]>([]);
  const [activePlate, setActivePlate] = useState<string | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);

  const search = async (searchPlate: string) => {
    if (!searchPlate.trim()) return;
    setLoading(true);
    try {
      const data = await fetchTracking(searchPlate.trim().toUpperCase());
      if (data.success && data.route) {
        setRoute(data.route);
        setActivePlate(data.license_plate);
        setShowTimeline(data.route.length > 0);
        onRouteLoaded(data.route);
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
    setShowTimeline(false);
    setPlate('');
    onClear();
  };

  return (
    <>
      {/* ── Search bar overlay (top-center of map) ───────────────── */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-lg px-4">
        <div className="bg-slate-800/95 backdrop-blur-sm rounded-xl border border-slate-700 p-3 shadow-2xl">
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-blue-400 shrink-0" />
            <input
              type="text"
              value={plate}
              onChange={(e) => setPlate(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && search(plate)}
              placeholder="Track vehicle — enter plate (e.g. GJ01AB1234)"
              className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={() => search(plate)}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {loading ? '…' : <Search className="w-4 h-4" />}
            </button>
            {activePlate && (
              <button
                onClick={clear}
                className="bg-slate-700 hover:bg-slate-600 p-1.5 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick-select chips */}
          <div className="flex gap-2 mt-2">
            {QUICK_PLATES.map((qp) => (
              <button
                key={qp}
                onClick={() => {
                  setPlate(qp);
                  search(qp);
                }}
                className={`px-2.5 py-0.5 rounded-full text-xs font-mono transition-colors ${
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
      </div>

      {/* ── Timeline drawer (bottom of map) ──────────────────────── */}
      {showTimeline && route.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 z-[1000]">
          <div className="bg-slate-800/95 backdrop-blur-sm border-t border-slate-700 shadow-2xl">
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/50">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-red-400" />
                <span className="text-sm font-semibold">
                  Route: <span className="font-mono text-red-400">{activePlate}</span> — {route.length} detection
                  {route.length !== 1 ? 's' : ''}
                </span>
              </div>
              <button
                onClick={() => setShowTimeline(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex overflow-x-auto gap-3 p-3">
              {route.map((det, idx) => (
                <div
                  key={det.detection_id}
                  className="shrink-0 bg-slate-900 rounded-lg p-3 border border-slate-700 w-56 hover:border-red-500/50 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(det.detected_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-200 truncate">
                    {det.camera?.landmark || 'Unknown'}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {det.camera?.district}
                    {det.camera?.city_or_taluka
                      ? `, ${det.camera.city_or_taluka}`
                      : ''}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-slate-500">
                      {det.camera?.camera_type}
                    </span>
                    <span
                      className={`text-xs font-medium ${
                        det.confidence >= 0.9
                          ? 'text-emerald-400'
                          : det.confidence >= 0.8
                            ? 'text-amber-400'
                            : 'text-red-400'
                      }`}
                    >
                      {(det.confidence * 100).toFixed(0)}% match
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
