import { useState, useEffect } from 'react';
import { X, Plus, Shield, Search } from 'lucide-react';
import { fetchWatchlist, createWatchlistEntry } from '../api/client';
import type { WatchlistEntry } from '../types';

interface WatchlistManagerProps {
  onClose: () => void;
}

const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'] as const;
const SOURCES = ['eGujCop', 'VAHAN', 'SARTHI', 'AFIS/NAFIS', 'Custom'] as const;
const ENTITY_TYPES = [
  'Stolen Vehicle',
  'Wanted Person Vehicle',
  'Suspicious Vehicle',
] as const;

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

export default function WatchlistManager({ onClose }: WatchlistManagerProps) {
  const [entries, setEntries] = useState<WatchlistEntry[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState('');

  const [addForm, setAddForm] = useState({
    license_plate: '',
    entity_type: 'Stolen Vehicle',
    alert_priority: 'High',
    source_database: 'eGujCop',
    vehicle_make_model: '',
    case_reference: '',
    notes: '',
  });

  const loadEntries = async () => {
    setLoading(true);
    try {
      const data = await fetchWatchlist();
      if (data.success) setEntries(data.data);
    } catch (err) {
      console.error('Failed to load watchlist:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await createWatchlistEntry(addForm);
      if (res.success) {
        setShowAdd(false);
        setAddForm({
          license_plate: '',
          entity_type: 'Stolen Vehicle',
          alert_priority: 'High',
          source_database: 'eGujCop',
          vehicle_make_model: '',
          case_reference: '',
          notes: '',
        });
        loadEntries();
      }
    } catch (err) {
      console.error('Failed to add entry:', err);
    }
  };

  const filtered = entries.filter(
    (e) =>
      e.license_plate.toLowerCase().includes(filterText.toLowerCase()) ||
      e.entity_type.toLowerCase().includes(filterText.toLowerCase()) ||
      (e.case_reference || '').toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[2000] flex justify-end bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-slate-800 border-l border-slate-700 shadow-2xl flex flex-col h-full">
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-semibold">Watchlist Manager</h2>
            <span className="bg-amber-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {entries.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAdd(!showAdd)}
              className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Target
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Add form ───────────────────────────────────────────── */}
        {showAdd && (
          <form
            onSubmit={handleAdd}
            className="p-4 border-b border-slate-700 space-y-3 shrink-0"
          >
            <div className="grid grid-cols-2 gap-3">
              <input
                value={addForm.license_plate}
                onChange={(e) =>
                  setAddForm((p) => ({
                    ...p,
                    license_plate: e.target.value.toUpperCase(),
                  }))
                }
                placeholder="License Plate *"
                required
                className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
              <select
                value={addForm.alert_priority}
                onChange={(e) =>
                  setAddForm((p) => ({ ...p, alert_priority: e.target.value }))
                }
                className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <select
                value={addForm.entity_type}
                onChange={(e) =>
                  setAddForm((p) => ({ ...p, entity_type: e.target.value }))
                }
                className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
              >
                {ENTITY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <select
                value={addForm.source_database}
                onChange={(e) =>
                  setAddForm((p) => ({ ...p, source_database: e.target.value }))
                }
                className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
              >
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <input
                value={addForm.vehicle_make_model}
                onChange={(e) =>
                  setAddForm((p) => ({
                    ...p,
                    vehicle_make_model: e.target.value,
                  }))
                }
                placeholder="Vehicle Make/Model"
                className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
              <input
                value={addForm.case_reference}
                onChange={(e) =>
                  setAddForm((p) => ({ ...p, case_reference: e.target.value }))
                }
                placeholder="Case Ref (FIR No.)"
                className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
            <textarea
              value={addForm.notes}
              onChange={(e) =>
                setAddForm((p) => ({ ...p, notes: e.target.value }))
              }
              placeholder="Notes…"
              rows={2}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
            />
            <button
              type="submit"
              className="w-full bg-amber-600 hover:bg-amber-500 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Add to Watchlist
            </button>
          </form>
        )}

        {/* ── Search filter ──────────────────────────────────────── */}
        <div className="px-4 py-3 border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5">
            <Search className="w-4 h-4 text-slate-500" />
            <input
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Filter plates, types, FIR numbers…"
              className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
            />
          </div>
        </div>

        {/* ── Table ──────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-6 text-center text-slate-500 text-sm">
              Loading watchlist…
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-sm">
              No entries found
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-900 text-slate-400 text-xs uppercase sticky top-0">
                <tr>
                  <th className="px-4 py-2.5 text-left">Plate</th>
                  <th className="px-2 py-2.5 text-left">Type</th>
                  <th className="px-2 py-2.5 text-left">Priority</th>
                  <th className="px-2 py-2.5 text-left">Source</th>
                  <th className="px-2 py-2.5 text-left">Case Ref</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="px-4 py-2.5 font-mono font-semibold text-slate-100">
                      {entry.license_plate}
                    </td>
                    <td className="px-2 py-2.5 text-slate-300 text-xs">
                      {entry.entity_type}
                    </td>
                    <td className="px-2 py-2.5">
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                          PRIORITY_BADGE[entry.alert_priority] ||
                          'bg-slate-600 text-white'
                        }`}
                      >
                        {entry.alert_priority}
                      </span>
                    </td>
                    <td className="px-2 py-2.5">
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          SOURCE_BADGE[entry.source_database] ||
                          'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {entry.source_database}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-xs text-slate-400 font-mono">
                      {entry.case_reference || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
