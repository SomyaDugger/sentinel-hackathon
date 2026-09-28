import { Shield, PlusCircle, List, Bell, Volume2, VolumeX, Download } from 'lucide-react';

interface HeaderProps {
  onOpenOnboarding: () => void;
  onOpenWatchlist: () => void;
  onToggleAlerts: () => void;
  alertCount: number;
  alertPanelOpen: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export default function Header({
  onOpenOnboarding,
  onOpenWatchlist,
  onToggleAlerts,
  alertCount,
  alertPanelOpen,
  soundEnabled,
  onToggleSound,
}: HeaderProps) {
  return (
    <header className="h-14 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-3">
        <Shield className="w-8 h-8 text-blue-400" />
        <div>
          <h1 className="text-lg font-bold tracking-wide text-slate-100">
            SENTINEL IVMS
          </h1>
          <p className="text-[10px] text-slate-400 -mt-1 tracking-widest uppercase">
            Gujarat State Command Center
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onOpenOnboarding}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          <span className="hidden sm:inline">Onboard Camera</span>
        </button>
        <button
          onClick={onOpenWatchlist}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors"
        >
          <List className="w-4 h-4" />
          <span className="hidden sm:inline">Watchlist</span>
        </button>
        <button
          onClick={() => window.open('/api/reports/detections-csv', '_blank')}
          className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-emerald-600/20"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Export CSV Report</span>
        </button>

        {/* Alert sound toggle */}
        <button
          onClick={onToggleSound}
          title={soundEnabled ? 'Mute alerts' : 'Enable alert sounds'}
          className={`p-1.5 rounded-lg text-sm transition-colors ${
            soundEnabled
              ? 'bg-emerald-600/20 border border-emerald-500/50'
              : 'bg-slate-700 hover:bg-slate-600'
          }`}
        >
          {soundEnabled ? (
            <Volume2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <VolumeX className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {/* Alert bell toggle */}
        <button
          onClick={onToggleAlerts}
          className={`relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            alertPanelOpen
              ? 'bg-red-600/20 border border-red-500/50 text-red-300'
              : 'bg-slate-700 hover:bg-slate-600'
          }`}
        >
          <Bell className={`w-4 h-4 ${alertPanelOpen ? 'text-red-400' : ''}`} />
          {alertCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold animate-pulse">
              {alertCount > 9 ? '9+' : alertCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
