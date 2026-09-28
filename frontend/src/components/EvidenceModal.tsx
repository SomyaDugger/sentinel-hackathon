import { useState } from 'react';
import { X, Shield, MapPin, Clock, CheckCircle, AlertTriangle, Camera, FileText } from 'lucide-react';
import { acknowledgeDetection } from '../api/client';

interface EvidenceModalProps {
  snapshot_url: string;
  license_plate: string;
  confidence: number;
  detected_at: string;
  detection_id: string;
  alert_status?: string;
  camera?: {
    landmark?: string;
    district?: string;
    department_name?: string;
    camera_type?: string;
    city_or_taluka?: string;
  };
  watchlist?: {
    entity_type?: string;
    alert_priority?: string;
    source_database?: string;
    case_reference?: string;
  };
  onClose: () => void;
  onAcknowledged?: () => void;
}

const PRIORITY_STYLES: Record<string, string> = {
  Critical: 'bg-red-600 text-white animate-pulse',
  High: 'bg-orange-500 text-white',
  Medium: 'bg-yellow-500 text-black',
  Low: 'bg-slate-600 text-white',
};

const SOURCE_BADGE: Record<string, string> = {
  eGujCop: 'bg-blue-900/60 text-blue-300 border-blue-700',
  VAHAN: 'bg-emerald-900/60 text-emerald-300 border-emerald-700',
  SARTHI: 'bg-purple-900/60 text-purple-300 border-purple-700',
  'AFIS/NAFIS': 'bg-orange-900/60 text-orange-300 border-orange-700',
  Custom: 'bg-slate-700 text-slate-300 border-slate-600',
};

export default function EvidenceModal({
  snapshot_url,
  license_plate,
  confidence,
  detected_at,
  detection_id,
  alert_status,
  camera,
  watchlist,
  onClose,
  onAcknowledged,
}: EvidenceModalProps) {
  const [status, setStatus] = useState(alert_status || 'New');
  const [acknowledging, setAcknowledging] = useState(false);

  const priority = watchlist?.alert_priority || 'Low';
  const source = watchlist?.source_database || 'Custom';

  const handleAcknowledge = async () => {
    setAcknowledging(true);
    try {
      const res = await acknowledgeDetection(detection_id);
      if (res.success) {
        setStatus('Acknowledged');
        onAcknowledged?.();
      }
    } catch (err) {
      console.error('Failed to acknowledge:', err);
    } finally {
      setAcknowledging(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-700 bg-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-red-400" />
            <h2 className="font-bold text-lg">Evidence Inspection</h2>
            <span
              className={`text-xs px-2 py-0.5 rounded font-bold ${
                PRIORITY_STYLES[priority] || PRIORITY_STYLES.Low
              }`}
            >
              {priority}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded border ${
                SOURCE_BADGE[source] || SOURCE_BADGE.Custom
              }`}
            >
              {source}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Snapshot */}
          <div className="flex-1 bg-black flex items-center justify-center relative min-h-[300px]">
            {snapshot_url && !snapshot_url.startsWith('/snapshots/det_') ? (
              <img
                src={snapshot_url}
                alt={`Evidence: ${license_plate}`}
                className="max-w-full max-h-full object-contain"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            ) : (
              <div className="text-center text-slate-500">
                <Camera className="w-16 h-16 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No visual snapshot available</p>
                <p className="text-xs text-slate-600 mt-1">
                  Run: python ai-engine/simulate_live_breach.py {license_plate}
                </p>
              </div>
            )}
            {/* Overlay badges on snapshot */}
            {snapshot_url && !snapshot_url.startsWith('/snapshots/det_') && (
              <>
                <div className="absolute top-3 left-3 flex items-center gap-1 bg-red-600 text-white text-xs px-2 py-1 rounded font-bold">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  EVIDENCE CAPTURE
                </div>
                <div className="absolute bottom-3 left-3 text-xs text-green-400 font-mono bg-black/70 px-2 py-1 rounded">
                  {license_plate} | {new Date(detected_at).toLocaleString()}
                </div>
              </>
            )}
          </div>

          {/* Details panel */}
          <div className="w-80 bg-slate-850 border-l border-slate-700 flex flex-col shrink-0 overflow-y-auto">
            {/* Suspect identity */}
            <div className="p-4 border-b border-slate-700">
              <p className="text-xs text-slate-400 uppercase font-semibold mb-1">
                License Plate
              </p>
              <p className="text-2xl font-mono font-bold text-white tracking-wider">
                {license_plate}
              </p>
              {watchlist?.entity_type && (
                <p className="text-sm text-red-400 font-medium mt-1">
                  {watchlist.entity_type}
                </p>
              )}
            </div>

            {/* Details grid */}
            <div className="p-4 space-y-3 flex-1">
              <DetailRow
                icon={<AlertTriangle className="w-4 h-4 text-red-400" />}
                label="Priority"
                value={priority}
                highlight
              />
              <DetailRow
                icon={<FileText className="w-4 h-4 text-blue-400" />}
                label="Source Database"
                value={source}
              />
              <DetailRow
                icon={<FileText className="w-4 h-4 text-amber-400" />}
                label="Case / FIR No."
                value={watchlist?.case_reference || 'N/A'}
              />
              <div className="border-t border-slate-700 pt-3">
                <DetailRow
                  icon={<Camera className="w-4 h-4 text-emerald-400" />}
                  label="Detecting Camera"
                  value={camera?.landmark || 'Unknown'}
                />
                <DetailRow
                  icon={<MapPin className="w-4 h-4 text-cyan-400" />}
                  label="District"
                  value={
                    camera?.district
                      ? `${camera.district}${camera.city_or_taluka ? `, ${camera.city_or_taluka}` : ''}`
                      : 'Unknown'
                  }
                />
              </div>
              <div className="border-t border-slate-700 pt-3">
                <DetailRow
                  icon={<Clock className="w-4 h-4 text-purple-400" />}
                  label="Detection Time"
                  value={new Date(detected_at).toLocaleString()}
                />
                <DetailRow
                  icon={<Shield className="w-4 h-4 text-slate-400" />}
                  label="Confidence"
                  value={`${(confidence * 100).toFixed(1)}%`}
                />
                <DetailRow
                  icon={<CheckCircle className="w-4 h-4 text-slate-400" />}
                  label="Status"
                  value={status}
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="p-4 border-t border-slate-700 shrink-0 space-y-2">
              {status === 'New' ? (
                <button
                  onClick={handleAcknowledge}
                  disabled={acknowledging}
                  className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  {acknowledging ? 'Acknowledging…' : 'Acknowledge Incident'}
                </button>
              ) : (
                <div className="w-full flex items-center justify-center gap-2 bg-emerald-600/20 border border-emerald-500/50 text-emerald-400 py-2.5 rounded-lg font-medium">
                  <CheckCircle className="w-4 h-4" />
                  Incident Acknowledged
                </div>
              )}
              <button
                onClick={onClose}
                className="w-full bg-slate-700 hover:bg-slate-600 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-start gap-2 mb-2">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <div>
        <p className="text-[10px] text-slate-500 uppercase">{label}</p>
        <p
          className={`text-sm font-medium ${
            highlight ? 'text-red-400' : 'text-slate-200'
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
