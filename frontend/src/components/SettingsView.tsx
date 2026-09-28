import {
  Settings,
  Database,
  Server,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  HardDrive,
} from 'lucide-react';

export default function SettingsView() {
  return (
    <div className="flex-1 overflow-y-auto bg-slate-900 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Settings className="w-6 h-6 text-blue-400" />
          <h2 className="text-xl font-bold">System Configuration</h2>
        </div>

        {/* Backend connection */}
        <SettingsCard title="Backend Connection" icon={<Database className="w-5 h-5 text-blue-400" />}>
          <div className="grid grid-cols-2 gap-4">
            <InfoRow label="Database" value="PostgreSQL 16 + PostGIS 3.4" />
            <InfoRow label="Host" value="db.zxkwxtosizmoxzodrdrd.supabase.co" />
            <InfoRow label="Provider" value="Supabase (Cloud)" />
            <InfoRow label="SSL" value="Enabled (TLS 1.3)" />
            <InfoRow label="Connection Pool" value="5–20 connections" />
            <InfoRow label="ORM" value="Sequelize v6" />
          </div>
          <div className="mt-4 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span className="text-sm text-emerald-400 font-medium">
              Connected — PostGIS spatial queries operational
            </span>
          </div>
        </SettingsCard>

        {/* VMS Federation */}
        <SettingsCard
          title="VMS Federation Adapters"
          icon={<Server className="w-5 h-5 text-amber-400" />}
        >
          <div className="space-y-3">
            {[
              { vendor: 'Hikvision', protocol: 'ISAPI + RTSP', status: 'Active', cameras: 6 },
              { vendor: 'Dahua', protocol: 'ONVIF Profile S', status: 'Active', cameras: 3 },
              { vendor: 'Milestone', protocol: 'XProtect MIP SDK', status: 'Active', cameras: 2 },
              { vendor: 'Matrix', protocol: 'SATATYA SAMAS API', status: 'Active', cameras: 2 },
              { vendor: 'Custom ONVIF', protocol: 'ONVIF Profile T', status: 'Standby', cameras: 2 },
            ].map((adapter) => (
              <div
                key={adapter.vendor}
                className="flex items-center justify-between bg-slate-800 rounded-lg px-4 py-3 border border-slate-700"
              >
                <div>
                  <span className="font-medium text-sm">{adapter.vendor}</span>
                  <span className="text-xs text-slate-400 ml-2">
                    {adapter.protocol}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-slate-400">
                    {adapter.cameras} cameras
                  </span>
                  <span
                    className={`flex items-center gap-1 text-xs font-medium ${
                      adapter.status === 'Active'
                        ? 'text-emerald-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {adapter.status === 'Active' ? (
                      <CheckCircle className="w-3 h-3" />
                    ) : (
                      <Clock className="w-3 h-3" />
                    )}
                    {adapter.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </SettingsCard>

        {/* Retention policies */}
        <SettingsCard
          title="Data Retention Policies"
          icon={<HardDrive className="w-5 h-5 text-purple-400" />}
        >
          <div className="space-y-3">
            {[
              {
                dept: 'Home Department',
                retention: '15 days',
                storage: 'Hot (SSD)',
                policy: 'Auto-archive to cold after 15d',
              },
              {
                dept: 'RTO',
                retention: '10 days',
                storage: 'Warm (HDD)',
                policy: 'Auto-purge after 10d',
              },
              {
                dept: 'Food & Civil Supplies',
                retention: '7 days',
                storage: 'Warm (HDD)',
                policy: 'Auto-purge after 7d',
              },
            ].map((rule) => (
              <div
                key={rule.dept}
                className="bg-slate-800 rounded-lg px-4 py-3 border border-slate-700"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{rule.dept}</span>
                  <span className="text-xs bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded">
                    {rule.retention}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <span>Storage: {rule.storage}</span>
                  <span>Policy: {rule.policy}</span>
                </div>
              </div>
            ))}
          </div>
        </SettingsCard>

        {/* Government database integrations */}
        <SettingsCard
          title="Government Database Integrations"
          icon={<Shield className="w-5 h-5 text-red-400" />}
        >
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                name: 'eGujCop',
                desc: 'Gujarat Police Criminal Database',
                status: 'Connected',
              },
              {
                name: 'VAHAN',
                desc: 'National Vehicle Registration',
                status: 'Connected',
              },
              {
                name: 'SARTHI',
                desc: 'Driving License Database',
                status: 'Connected',
              },
              {
                name: 'AFIS/NAFIS',
                desc: 'Fingerprint Identification',
                status: 'Offline',
              },
            ].map((db) => (
              <div
                key={db.name}
                className="bg-slate-800 rounded-lg p-3 border border-slate-700"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm">{db.name}</span>
                  {db.status === 'Connected' ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400" />
                  )}
                </div>
                <p className="text-xs text-slate-400">{db.desc}</p>
                <p
                  className={`text-xs mt-1 font-medium ${
                    db.status === 'Connected'
                      ? 'text-emerald-400'
                      : 'text-red-400'
                  }`}
                >
                  {db.status}
                </p>
              </div>
            ))}
          </div>
        </SettingsCard>

        {/* System info */}
        <SettingsCard title="System Info" icon={<Server className="w-5 h-5 text-slate-400" />}>
          <div className="grid grid-cols-2 gap-4">
            <InfoRow label="API Server" value="Express.js (Node 20 LTS)" />
            <InfoRow label="API Port" value="3000" />
            <InfoRow label="Frontend" value="React 18 + Vite 5" />
            <InfoRow label="Frontend Port" value="5173" />
            <InfoRow label="ANPR Engine" value="YOLO v8 + PaddleOCR (Planned)" />
            <InfoRow label="Platform Version" value="1.0.0-hackathon" />
          </div>
        </SettingsCard>
      </div>
    </div>
  );
}

function SettingsCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-700 bg-slate-800">
        {icon}
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-slate-500 uppercase">{label}</span>
      <p className="text-sm text-slate-200 font-medium">{value}</p>
    </div>
  );
}
