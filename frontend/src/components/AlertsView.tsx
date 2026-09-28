import { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, RefreshCw, Filter, ChevronDown, Download, Image } from 'lucide-react';
import { fetchAlerts } from '../api/client';
import type { AlertEntry } from '../types';

const downloadCsv = () => {
  window.open('/api/reports/detections-csv', '_blank');
};

interface AlertsViewProps {
  onViewEvidence?: (alert: AlertEntry) => void;
}

const PRIORITY_BADGE: Record<string, string> = {
  Critical: 'bg-red-600 text-white',
  High: 'bg-orange-500 text-white',
  Medium: 'bg-yellow-500 text-black',
  Low: 'bg-slate-600 text-white',
};

const SOURCE_BADGE: Record<string, string> = {
  eGujCop: 'bg-blue-900/50 text-blue-300',
  VAHAN: 'bg-emerald-900/50 text-emerald-300',
  SARTHI: 'bg-purple-900/50 text-purple-300',
  'AFIS/NAFIS': 'bg-orange-900/50 text-orange-300',
  Custom: 'bg-slate-700 text-slate-300',
};

export default function AlertsView({ onViewEvidence }: AlertsViewProps) {
  const [alerts, setAlerts] = useState<AlertEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [sourceFilter, setSourceFilter] = useState('All');
  const [search, setSearch] = useState('');

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const data = await fetchAlerts();
      if (data.success) setAlerts(data.data);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const filtered = useMemo(() => {
    return alerts.filter((a) => {
      const matchPriority =
        priorityFilter === 'All' ||
        a.watchlist?.alert_priority === priorityFilter;
      const matchSource =
        sourceFilter === 'All' ||
        a.watchlist?.source_database === sourceFilter;
      const matchSearch =
        !search ||
        a.license_plate.toLowerCase().includes(search.toLowerCase()) ||
        (a.camera?.landmark || '').toLowerCase().includes(search.toLowerCase()) ||
        (a.camera?.district || '').toLowerCase().includes(search.toLowerCase());
      return matchPriority && matchSource && matchSearch;
    });
  }, [alerts, priorityFilter, sourceFilter, search]);

  const stats = useMemo(() => {
    const critical = alerts.filter(
      (a) => a.watchlist?.alert_priority === 'Critical'
    ).length;
    const high = alerts.filter(
      (a) => a.watchlist?.alert_priority === 'High'
    ).length;
    const medium = alerts.filter(
      (a) => a.watchlist?.alert_priority === 'Medium'
    ).length;
    return { total: alerts.length, critical, high, medium };
  }, [alerts]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-900">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-700 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <h2 className="text-xl font-bold">Security Alert Log</h2>
            <span className="text-sm text-slate-400">
              ({stats.total} total)
            </span>
          </div>
          <button
            onClick={loadAlerts}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button
            onClick={downloadCsv}
            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" /> Export Report (CSV)
          </button>
        </div>

        {/* Priority stat cards */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
            <span className="text-xs text-slate-400 uppercase">Total</span>
            <p className="text-2xl font-bold text-blue-400">{stats.total}</p>
          </div>
          <div className="bg-red-900/20 border border-red-800/50 rounded-lg p-3">
            <span className="text-xs text-red-400 uppercase">Critical</span>
            <p className="text-2xl font-bold text-red-400">{stats.critical}</p>
          </div>
          <div className="bg-orange-900/20 border border-orange-800/50 rounded-lg p-3">
            <span className="text-xs text-orange-400 uppercase">High</span>
            <p className="text-2xl font-bold text-orange-400">{stats.high}</p>
          </div>
          <div className="bg-yellow-900/20 border border-yellow-800/50 rounded-lg p-3">
            <span className="text-xs text-yellow-400 uppercase">Medium</span>
            <p className="text-2xl font-bold text-yellow-400">{stats.medium}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-slate-500" />
          <div className="flex-1 flex items-center gap-2 bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search plate, location…"
              className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
            />
          </div>
          <div className="relative">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="appearance-none bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 pr-8 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
            >
              <option value="All">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="appearance-none bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 pr-8 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
            >
              <option value="All">All Sources</option>
              <option value="eGujCop">eGujCop</option>
              <option value="VAHAN">VAHAN</option>
              <option value="SARTHI">SARTHI</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading alerts…</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-800 text-slate-400 text-xs uppercase sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left">Time</th>
                <th className="px-3 py-3 text-left">Plate</th>
                <th className="px-3 py-3 text-left">Priority</th>
                <th className="px-3 py-3 text-left">Type</th>
                <th className="px-3 py-3 text-left">Source DB</th>
                <th className="px-3 py-3 text-left">Camera / Location</th>
                <th className="px-3 py-3 text-left">Confidence</th>
                <th className="px-3 py-3 text-left">Case Ref</th>
                <th className="px-3 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((alert) => {
                const priority = alert.watchlist?.alert_priority || 'Low';
                const source = alert.watchlist?.source_database || 'Custom';
                const hasSnap = alert.snapshot_url && !alert.snapshot_url.startsWith('/snapshots/det_');
                return (
                  <tr
                    key={alert.id}
                    onClick={() => onViewEvidence?.(alert)}
                    className={`border-b border-slate-800 hover:bg-slate-800/60 transition-colors cursor-pointer ${
                      priority === 'Critical' ? 'bg-red-900/10' : ''
                    }`}
                  >
                    <td className="px-4 py-3 text-slate-400 text-xs font-mono whitespace-nowrap">
                      {new Date(alert.detected_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-3 font-mono font-semibold text-slate-100">
                      {alert.license_plate}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-medium ${
                          PRIORITY_BADGE[priority] || PRIORITY_BADGE.Low
                        } ${priority === 'Critical' ? 'alert-critical' : ''}`}
                      >
                        {priority}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-300">
                      {alert.watchlist?.entity_type}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          SOURCE_BADGE[source] || SOURCE_BADGE.Custom
                        }`}
                      >
                        {source}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-300">
                      <div>{alert.camera?.landmark || '—'}</div>
                      <div className="text-slate-500">
                        {alert.camera?.district}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`text-xs font-medium ${
                          alert.confidence >= 0.9
                            ? 'text-emerald-400'
                            : alert.confidence >= 0.8
                              ? 'text-amber-400'
                              : 'text-red-400'
                        }`}
                      >
                        {(alert.confidence * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-400 font-mono">
                      {alert.watchlist?.case_reference || '—'}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          alert.alert_status === 'New'
                            ? 'bg-red-900/50 text-red-300'
                            : alert.alert_status === 'Acknowledged'
                              ? 'bg-amber-900/50 text-amber-300'
                              : 'bg-emerald-900/50 text-emerald-300'
                        }`}
                      >
                        {alert.alert_status}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    No alerts match the current filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
