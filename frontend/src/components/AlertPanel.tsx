import { Bell, RefreshCw, Image } from 'lucide-react';
import type { AlertEntry } from '../types';

interface AlertPanelProps {
  alerts: AlertEntry[];
  onAlertClick: (alert: AlertEntry) => void;
  onRefresh: () => void;
  onViewEvidence?: (alert: AlertEntry) => void;
}

const PRIORITY_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  Critical: { bg: 'bg-red-900/40', text: 'text-red-400', dot: 'bg-red-500 alert-critical' },
  High:     { bg: 'bg-orange-900/30', text: 'text-orange-400', dot: 'bg-orange-500' },
  Medium:   { bg: 'bg-yellow-900/20', text: 'text-yellow-400', dot: 'bg-yellow-500' },
  Low:      { bg: 'bg-slate-800', text: 'text-slate-400', dot: 'bg-slate-500' },
};

const SOURCE_BADGE: Record<string, string> = {
  eGujCop:      'bg-blue-900/50 text-blue-300 border-blue-700',
  VAHAN:        'bg-emerald-900/50 text-emerald-300 border-emerald-700',
  SARTHI:       'bg-purple-900/50 text-purple-300 border-purple-700',
  'AFIS/NAFIS': 'bg-orange-900/50 text-orange-300 border-orange-700',
  Custom:       'bg-slate-700 text-slate-300 border-slate-600',
};

function hasRealSnapshot(url: string | undefined): boolean {
  return !!url && !url.startsWith('/snapshots/det_');
}

export default function AlertPanel({ alerts, onAlertClick, onRefresh, onViewEvidence }: AlertPanelProps) {
  return (
    <aside className="w-80 bg-slate-800 border-l border-slate-700 flex flex-col shrink-0 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-red-400" />
          <h2 className="font-semibold text-sm">Live Alerts</h2>
          <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
            {alerts.length}
          </span>
        </div>
        <button
          onClick={onRefresh}
          className="text-slate-400 hover:text-slate-200 transition-colors"
          title="Refresh alerts"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Alert feed */}
      <div className="flex-1 overflow-y-auto">
        {alerts.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-sm">
            No active watchlist alerts
          </div>
        ) : (
          alerts.map((alert) => {
            const priority = alert.watchlist?.alert_priority || 'Low';
            const styles = PRIORITY_STYLES[priority] || PRIORITY_STYLES.Low;
            const source = alert.watchlist?.source_database || 'Custom';
            const badgeStyle = SOURCE_BADGE[source] || SOURCE_BADGE.Custom;
            const hasSnap = hasRealSnapshot(alert.snapshot_url);

            return (
              <div
                key={alert.id}
                className={`w-full text-left p-3 border-b border-slate-700/50 hover:bg-slate-700/50 transition-colors ${styles.bg}`}
              >
                {/* Priority + source badge */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${styles.dot}`} />
                    <span className={`text-xs font-semibold uppercase ${styles.text}`}>
                      {priority}
                    </span>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${badgeStyle}`}>
                    {source}
                  </span>
                </div>

                {/* Snapshot thumbnail + plate */}
                <div className="flex gap-2">
                  {hasSnap ? (
                    <button
                      onClick={() => onViewEvidence?.(alert)}
                      className="shrink-0 w-16 h-12 rounded overflow-hidden border border-slate-600 hover:border-blue-500 transition-colors relative group"
                    >
                      <img
                        src={alert.snapshot_url}
                        alt="ANPR"
                        className="w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Image className="w-4 h-4 text-white" />
                      </div>
                    </button>
                  ) : null}
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => {
                        if (hasSnap) onViewEvidence?.(alert);
                        else onAlertClick(alert);
                      }}
                      className="text-left"
                    >
                      <p className="text-sm font-mono font-semibold text-slate-100">
                        {alert.license_plate}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {alert.watchlist?.entity_type}
                        {alert.watchlist?.case_reference &&
                          ` · ${alert.watchlist.case_reference}`}
                      </p>
                    </button>
                  </div>
                </div>

                {/* Location + time */}
                <button
                  onClick={() => onAlertClick(alert)}
                  className="w-full text-left mt-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 truncate max-w-[140px]">
                      📍 {alert.camera?.landmark || 'Unknown'}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {new Date(alert.detected_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[11px] text-slate-500">
                      {(alert.confidence * 100).toFixed(0)}% conf
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {alert.camera?.district}
                    </span>
                  </div>
                </button>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
