import { useEffect, useState } from 'react';
import { AlertTriangle, X, Volume2, Image } from 'lucide-react';
import type { AlertEntry } from '../types';

interface AlertToastProps {
  alerts: AlertEntry[];
  previousCount: number;
  soundEnabled: boolean;
  onViewEvidence?: (alert: AlertEntry) => void;
}

interface ToastItem {
  id: string;
  alert: AlertEntry;
  timestamp: number;
}

function playAlertChime(priority: string) {
  try {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    const isCritical = priority === 'Critical';
    oscillator.frequency.value = isCritical ? 880 : 660;
    oscillator.type = 'sine';
    gain.gain.value = 0.3;
    oscillator.start();
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + (isCritical ? 0.6 : 0.3));
    oscillator.stop(ctx.currentTime + (isCritical ? 0.7 : 0.4));
    if (isCritical) {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.value = 1046;
      osc2.type = 'sine';
      gain2.gain.value = 0.3;
      osc2.start(ctx.currentTime + 0.25);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.7);
      osc2.stop(ctx.currentTime + 0.8);
    }
  } catch { /* Web Audio not available */ }
}

const PRIORITY_STYLES: Record<string, { border: string; bg: string; text: string }> = {
  Critical: { border: 'border-red-500', bg: 'bg-red-900/80', text: 'text-red-400' },
  High: { border: 'border-orange-500', bg: 'bg-orange-900/80', text: 'text-orange-400' },
};

function hasRealSnapshot(url: string | undefined): boolean {
  return !!url && !url.startsWith('/snapshots/det_');
}

export default function AlertToast({ alerts, previousCount, soundEnabled, onViewEvidence }: AlertToastProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    if (alerts.length <= previousCount || previousCount < 0) return;
    const newAlerts = alerts.slice(0, alerts.length - previousCount);
    const criticalOrHigh = newAlerts.filter((a) => {
      const prio = a.watchlist?.alert_priority;
      return prio === 'Critical' || prio === 'High';
    });
    if (criticalOrHigh.length === 0) return;
    if (soundEnabled) {
      const topPriority = criticalOrHigh.find((a) => a.watchlist?.alert_priority === 'Critical') ? 'Critical' : 'High';
      playAlertChime(topPriority);
    }
    const newToasts: ToastItem[] = criticalOrHigh.map((alert) => ({
      id: alert.id + '-' + Date.now(),
      alert,
      timestamp: Date.now(),
    }));
    setToasts((prev) => [...newToasts, ...prev].slice(0, 5));
    const timers = newToasts.map((t) =>
      setTimeout(() => { setToasts((prev) => prev.filter((p) => p.id !== t.id)); }, 8000)
    );
    return () => timers.forEach(clearTimeout);
  }, [alerts.length, previousCount, soundEnabled]);

  const dismiss = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-16 right-4 z-[3000] space-y-2 w-96">
      {toasts.map((toast) => {
        const priority = toast.alert.watchlist?.alert_priority || 'High';
        const styles = PRIORITY_STYLES[priority] || PRIORITY_STYLES.High;
        const hasSnap = hasRealSnapshot(toast.alert.snapshot_url);
        return (
          <div
            key={toast.id}
            className={`${styles.bg} backdrop-blur-sm border ${styles.border} rounded-xl p-4 shadow-2xl animate-[slideIn_0.3s_ease-out]`}
          >
            <div className="flex items-start gap-3">
              {/* Snapshot thumbnail */}
              {hasSnap ? (
                <button
                  onClick={() => onViewEvidence?.(toast.alert)}
                  className="shrink-0 w-14 h-10 rounded overflow-hidden border border-slate-600 hover:border-white transition-colors"
                >
                  <img src={toast.alert.snapshot_url} alt="ANPR" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                </button>
              ) : (
                <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${styles.text} ${priority === 'Critical' ? 'animate-pulse' : ''}`} />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-bold uppercase ${styles.text}`}>{priority} ALERT</span>
                  {soundEnabled && <Volume2 className="w-3 h-3 text-slate-400" />}
                </div>
                <p className="text-sm font-mono font-bold text-white">{toast.alert.license_plate}</p>
                <p className="text-xs text-slate-300 mt-0.5">
                  {toast.alert.watchlist?.entity_type} · {toast.alert.watchlist?.source_database}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  📍 {toast.alert.camera?.landmark || 'Unknown'}, {toast.alert.camera?.district}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <button onClick={() => dismiss(toast.id)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
                {hasSnap && (
                  <button
                    onClick={() => onViewEvidence?.(toast.alert)}
                    className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    <Image className="w-3 h-3" /> View
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
