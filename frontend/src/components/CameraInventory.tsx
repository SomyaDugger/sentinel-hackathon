import { useState, useMemo } from 'react';
import {
  Camera,
  Search,
  RefreshCw,
  Wifi,
  WifiOff,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import type { Camera as CameraType } from '../types';

interface CameraInventoryProps {
  cameras: CameraType[];
  onRefresh: () => void;
}

const HEALTH_STYLES: Record<string, { dot: string; text: string }> = {
  Online: { dot: 'bg-emerald-500', text: 'text-emerald-400' },
  Offline: { dot: 'bg-red-500', text: 'text-red-400' },
  Degraded: { dot: 'bg-amber-500', text: 'text-amber-400' },
};

const DEPT_BADGE: Record<string, string> = {
  'Home Department': 'bg-blue-900/50 text-blue-300',
  RTO: 'bg-amber-900/50 text-amber-300',
  'Food & Civil Supplies': 'bg-emerald-900/50 text-emerald-300',
};

export default function CameraInventory({
  cameras,
  onRefresh,
}: CameraInventoryProps) {
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [healthFilter, setHealthFilter] = useState('All');

  const departments = useMemo(
    () => ['All', ...new Set(cameras.map((c) => c.department_name))],
    [cameras]
  );

  const filtered = useMemo(() => {
    return cameras.filter((cam) => {
      const matchSearch =
        !search ||
        cam.landmark.toLowerCase().includes(search.toLowerCase()) ||
        cam.district.toLowerCase().includes(search.toLowerCase()) ||
        cam.vms_vendor.toLowerCase().includes(search.toLowerCase());
      const matchDept =
        deptFilter === 'All' || cam.department_name === deptFilter;
      const matchHealth =
        healthFilter === 'All' || cam.health_status === healthFilter;
      return matchSearch && matchDept && matchHealth;
    });
  }, [cameras, search, deptFilter, healthFilter]);

  const stats = useMemo(() => {
    const online = cameras.filter((c) => c.health_status === 'Online').length;
    const offline = cameras.filter((c) => c.health_status === 'Offline').length;
    const degraded = cameras.filter(
      (c) => c.health_status === 'Degraded'
    ).length;
    return { total: cameras.length, online, offline, degraded };
  }, [cameras]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-900">
      {/* Stats bar */}
      <div className="px-6 py-4 border-b border-slate-700 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Camera className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-bold">Camera Inventory</h2>
            <span className="text-sm text-slate-400">
              ({stats.total} total)
            </span>
          </div>
          <button
            onClick={onRefresh}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {/* Health summary cards */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <StatCard label="Total" value={stats.total} color="text-blue-400" />
          <StatCard
            label="Online"
            value={stats.online}
            color="text-emerald-400"
            icon={<Wifi className="w-4 h-4" />}
          />
          <StatCard
            label="Offline"
            value={stats.offline}
            color="text-red-400"
            icon={<WifiOff className="w-4 h-4" />}
          />
          <StatCard
            label="Degraded"
            value={stats.degraded}
            color="text-amber-400"
            icon={<AlertTriangle className="w-4 h-4" />}
          />
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <div className="flex-1 flex items-center gap-2 bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5">
            <Search className="w-4 h-4 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search landmark, district, vendor…"
              className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
            />
          </div>
          <FilterDropdown
            value={deptFilter}
            onChange={setDeptFilter}
            options={departments}
            label="Department"
          />
          <FilterDropdown
            value={healthFilter}
            onChange={setHealthFilter}
            options={['All', 'Online', 'Offline', 'Degraded']}
            label="Health"
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-800 text-slate-400 text-xs uppercase sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-left">Landmark</th>
              <th className="px-3 py-3 text-left">District</th>
              <th className="px-3 py-3 text-left">Department</th>
              <th className="px-3 py-3 text-left">Type</th>
              <th className="px-3 py-3 text-left">VMS Vendor</th>
              <th className="px-3 py-3 text-left">Health</th>
              <th className="px-3 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((cam) => {
              const health =
                HEALTH_STYLES[cam.health_status] || HEALTH_STYLES.Offline;
              const deptStyle =
                DEPT_BADGE[cam.department_name] || 'bg-slate-700 text-slate-300';
              return (
                <tr
                  key={cam.id}
                  className="border-b border-slate-800 hover:bg-slate-800/60 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-slate-100">
                    {cam.landmark}
                  </td>
                  <td className="px-3 py-3 text-slate-300">{cam.district}</td>
                  <td className="px-3 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${deptStyle}`}
                    >
                      {cam.department_name}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-slate-300 font-mono text-xs">
                    {cam.camera_type}
                  </td>
                  <td className="px-3 py-3 text-slate-300">{cam.vms_vendor}</td>
                  <td className="px-3 py-3">
                    <span className={`flex items-center gap-1.5 ${health.text}`}>
                      <span
                        className={`w-2 h-2 rounded-full ${health.dot} ${cam.health_status === 'Online' ? 'animate-pulse' : ''}`}
                      />
                      {cam.health_status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <button className="px-2 py-1 bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 rounded text-xs font-medium transition-colors">
                      Ping
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-slate-500"
                >
                  No cameras match the current filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-400 uppercase">{label}</span>
        {icon && <span className={color}>{icon}</span>}
      </div>
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
    </div>
  );
}

function FilterDropdown({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  label: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 pr-8 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt === 'All' ? `All ${label}s` : opt}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
    </div>
  );
}
