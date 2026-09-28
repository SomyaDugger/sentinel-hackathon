import { useState, useRef, useCallback } from 'react';
import { X, Upload, Camera, MapPin, Check, AlertCircle } from 'lucide-react';
import { onboardCamera, bulkUploadCameras } from '../api/client';

interface OnboardingModalProps {
  onClose: () => void;
  onCameraAdded: () => void;
}

const CAMERA_TYPES = ['ANPR', 'PTZ', 'Fixed Bullet', 'Dome', 'Analog-Encoder'] as const;
const VMS_VENDORS = ['Hikvision', 'Milestone', 'Dahua', 'Matrix', 'Custom ONVIF'] as const;
const DEPARTMENTS = ['Home Department', 'RTO', 'Food & Civil Supplies'] as const;

export default function OnboardingModal({ onClose, onCameraAdded }: OnboardingModalProps) {
  const [tab, setTab] = useState<'single' | 'bulk'>('single');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  // ── Single onboarding form ────────────────────────────────────────────
  const [form, setForm] = useState({
    department_name: 'Home Department',
    district: '',
    city_or_taluka: '',
    landmark: '',
    camera_type: 'ANPR',
    rtsp_url: '',
    vms_vendor: 'Hikvision',
    retention_days: '15',
    resolution: '1080p',
    latitude: '',
    longitude: '',
  });

  const updateForm = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await onboardCamera({
        ...form,
        retention_days: parseInt(form.retention_days, 10) || 15,
      });
      if (res.success) {
        setMessage({
          type: 'success',
          text: `Camera onboarded successfully (${res.data.district})`,
        });
        onCameraAdded();
        setForm((prev) => ({
          ...prev,
          district: '',
          city_or_taluka: '',
          landmark: '',
          rtsp_url: '',
          latitude: '',
          longitude: '',
        }));
      } else {
        setMessage({
          type: 'error',
          text: res.error?.message || 'Failed to onboard camera',
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error';
      setMessage({ type: 'error', text: msg });
    } finally {
      setLoading(false);
    }
  };

  // ── Bulk upload ───────────────────────────────────────────────────────
  const handleFileUpload = useCallback(
    async (file: File) => {
      setLoading(true);
      setMessage(null);
      try {
        const res = await bulkUploadCameras(file);
        if (res.success) {
          setMessage({
            type: 'success',
            text: `Bulk upload: ${res.data.successfully_created} cameras created (${res.data.errors.length} errors)`,
          });
          onCameraAdded();
        } else {
          setMessage({
            type: 'error',
            text: res.error?.message || 'Upload failed',
          });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Network error';
        setMessage({ type: 'error', text: msg });
      } finally {
        setLoading(false);
      }
    },
    [onCameraAdded]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith('.csv')) handleFileUpload(file);
    },
    [handleFileUpload]
  );

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <Camera className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold">Camera Onboarding</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700">
          <button
            onClick={() => setTab('single')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              tab === 'single'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Single Onboarding
          </button>
          <button
            onClick={() => setTab('bulk')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              tab === 'bulk'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Bulk CSV Upload
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {message && (
            <div
              className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-sm ${
                message.type === 'success'
                  ? 'bg-emerald-900/50 text-emerald-300'
                  : 'bg-red-900/50 text-red-300'
              }`}
            >
              {message.type === 'success' ? (
                <Check className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              {message.text}
            </div>
          )}

          {tab === 'single' ? (
            <form onSubmit={handleSingleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormSelect
                  label="Department"
                  value={form.department_name}
                  onChange={(v) => updateForm('department_name', v)}
                  options={DEPARTMENTS}
                />
                <FormInput
                  label="District"
                  value={form.district}
                  onChange={(v) => updateForm('district', v)}
                  placeholder="e.g. Ahmedabad"
                  required
                />
                <FormInput
                  label="City / Taluka"
                  value={form.city_or_taluka}
                  onChange={(v) => updateForm('city_or_taluka', v)}
                  placeholder="e.g. Ahmedabad City"
                  required
                />
                <FormInput
                  label="Landmark"
                  value={form.landmark}
                  onChange={(v) => updateForm('landmark', v)}
                  placeholder="e.g. SG Highway Junction"
                  required
                />
                <FormSelect
                  label="Camera Type"
                  value={form.camera_type}
                  onChange={(v) => updateForm('camera_type', v)}
                  options={CAMERA_TYPES}
                />
                <FormSelect
                  label="VMS Vendor"
                  value={form.vms_vendor}
                  onChange={(v) => updateForm('vms_vendor', v)}
                  options={VMS_VENDORS}
                />
                <FormInput
                  label="RTSP URL"
                  value={form.rtsp_url}
                  onChange={(v) => updateForm('rtsp_url', v)}
                  placeholder="rtsp://10.10.1.101:554/stream1"
                  required
                />
                <FormInput
                  label="Resolution"
                  value={form.resolution}
                  onChange={(v) => updateForm('resolution', v)}
                  placeholder="1080p"
                />
                <FormInput
                  label="Latitude"
                  value={form.latitude}
                  onChange={(v) => updateForm('latitude', v)}
                  placeholder="22.3072"
                />
                <FormInput
                  label="Longitude"
                  value={form.longitude}
                  onChange={(v) => updateForm('longitude', v)}
                  placeholder="73.1812"
                />
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <MapPin className="w-3 h-3" />
                Tip: Use the GIS map to visually identify coordinates for the
                camera location
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {loading ? 'Onboarding…' : 'Onboard Camera'}
              </button>
            </form>
          ) : (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
                dragActive
                  ? 'border-blue-400 bg-blue-900/20'
                  : 'border-slate-600 hover:border-slate-500'
              }`}
            >
              <Upload className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <p className="text-slate-300 mb-1">
                Drag & drop your CSV file here
              </p>
              <p className="text-sm text-slate-500 mb-4">
                Format must match the Sentinel camera schema. Max 10 MB.
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {loading ? 'Uploading…' : 'Choose CSV File'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Reusable form primitives ────────────────────────────────────────────
function FormInput({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
      />
    </div>
  );
}

function FormSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}
