import { Map, Camera, Navigation, AlertTriangle, Settings } from 'lucide-react';

export type TabId = 'map' | 'cameras' | 'tracking' | 'alerts' | 'settings';

interface SidebarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const TABS: { id: TabId; icon: React.ReactNode; label: string }[] = [
  { id: 'map', icon: <Map className="w-5 h-5" />, label: 'Map' },
  { id: 'cameras', icon: <Camera className="w-5 h-5" />, label: 'Cameras' },
  { id: 'tracking', icon: <Navigation className="w-5 h-5" />, label: 'Tracking' },
  { id: 'alerts', icon: <AlertTriangle className="w-5 h-5" />, label: 'Alerts' },
];

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <aside className="w-14 bg-slate-800 border-r border-slate-700 flex flex-col items-center py-4 gap-3 shrink-0">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          title={tab.label}
          onClick={() => onTabChange(tab.id)}
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
            activeTab === tab.id
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
              : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'
          }`}
        >
          {tab.icon}
        </button>
      ))}

      <div className="flex-1" />
      <div className="w-8 border-t border-slate-700 mb-2" />

      <button
        title="Settings"
        onClick={() => onTabChange('settings')}
        className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
          activeTab === 'settings'
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
            : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'
        }`}
      >
        <Settings className="w-5 h-5" />
      </button>
    </aside>
  );
}
