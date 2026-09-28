import { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import type { TabId } from './components/Sidebar';
import MapViewer from './components/MapViewer';
import RouteTracker from './components/RouteTracker';
import AlertPanel from './components/AlertPanel';
import AlertToast from './components/AlertToast';
import EvidenceModal from './components/EvidenceModal';
import OnboardingModal from './components/OnboardingModal';
import WatchlistManager from './components/WatchlistManager';
import CameraInventory from './components/CameraInventory';
import TrackingView from './components/TrackingView';
import AlertsView from './components/AlertsView';
import SettingsView from './components/SettingsView';
import { fetchCameras, fetchAlerts } from './api/client';
import type { Camera, AlertEntry, Detection } from './types';

// Evidence modal data shape
interface EvidenceData {
  snapshot_url: string;
  license_plate: string;
  confidence: number;
  detected_at: string;
  detection_id: string;
  alert_status?: string;
  camera?: Record<string, unknown>;
  watchlist?: Record<string, unknown>;
}

export default function App() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [alerts, setAlerts] = useState<AlertEntry[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([22.2587, 71.1924]);
  const [mapZoom, setMapZoom] = useState(7);
  const [trackingRoute, setTrackingRoute] = useState<Detection[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showWatchlist, setShowWatchlist] = useState(false);
  const [showAlertPanel, setShowAlertPanel] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('map');
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [evidenceItem, setEvidenceItem] = useState<EvidenceData | null>(null);

  const prevAlertCount = useRef(-1);
  const [prevCount, setPrevCount] = useState(-1);

  const loadCameras = useCallback(async () => {
    try {
      const data = await fetchCameras();
      if (data.success) setCameras(data.data);
    } catch (err) {
      console.error('Failed to load cameras:', err);
    }
  }, []);

  const loadAlerts = useCallback(async () => {
    try {
      const data = await fetchAlerts();
      if (data.success) {
        setPrevCount(prevAlertCount.current);
        setAlerts(data.data);
        prevAlertCount.current = data.data.length;
      }
    } catch (err) {
      console.error('Failed to load alerts:', err);
    }
  }, []);

  useEffect(() => {
    loadCameras();
    loadAlerts();
    const interval = setInterval(loadAlerts, 5000);
    return () => clearInterval(interval);
  }, [loadCameras, loadAlerts]);

  const handleAlertClick = (alert: AlertEntry) => {
    if (alert.camera?.location) {
      setMapCenter([
        alert.camera.location.coordinates[1],
        alert.camera.location.coordinates[0],
      ]);
      setMapZoom(14);
      setActiveTab('map');
    }
  };

  const openEvidence = (item: EvidenceData) => setEvidenceItem(item);

  const openAlertEvidence = (alert: AlertEntry) => {
    openEvidence({
      snapshot_url: alert.snapshot_url,
      license_plate: alert.license_plate,
      confidence: alert.confidence,
      detected_at: alert.detected_at,
      detection_id: alert.id,
      alert_status: alert.alert_status,
      camera: alert.camera as unknown as Record<string, unknown>,
      watchlist: alert.watchlist as unknown as Record<string, unknown>,
    });
  };

  const openDetectionEvidence = (det: Detection) => {
    openEvidence({
      snapshot_url: det.snapshot_url,
      license_plate: det.license_plate,
      confidence: det.confidence,
      detected_at: det.detected_at,
      detection_id: det.detection_id,
      alert_status: det.alert_status,
      camera: det.camera as unknown as Record<string, unknown>,
    });
  };

  const handleToggleAlerts = () => {
    setShowAlertPanel((p) => !p);
    if (!showAlertPanel) setActiveTab('map');
  };

  return (
    <div className="h-screen flex flex-col bg-slate-900 text-slate-100 overflow-hidden">
      <Header
        onOpenOnboarding={() => setShowOnboarding(true)}
        onOpenWatchlist={() => setShowWatchlist(true)}
        onToggleAlerts={handleToggleAlerts}
        alertCount={alerts.length}
        alertPanelOpen={showAlertPanel && activeTab === 'map'}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled((p) => !p)}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === 'map' && (
          <>
            <main className="flex-1 relative overflow-hidden">
              <MapViewer
                cameras={cameras}
                trackingRoute={trackingRoute}
                center={mapCenter}
                zoom={mapZoom}
              />
              <RouteTracker
                onRouteLoaded={(route) => {
                  setTrackingRoute(route);
                  if (route.length > 0 && route[0].camera?.coordinates) {
                    setMapCenter([
                      route[0].camera.coordinates.latitude,
                      route[0].camera.coordinates.longitude,
                    ]);
                    setMapZoom(8);
                  }
                }}
                onClear={() => setTrackingRoute([])}
              />
            </main>
            {showAlertPanel && (
              <AlertPanel
                alerts={alerts}
                onAlertClick={handleAlertClick}
                onRefresh={loadAlerts}
                onViewEvidence={openAlertEvidence}
              />
            )}
          </>
        )}

        {activeTab === 'cameras' && (
          <CameraInventory cameras={cameras} onRefresh={loadCameras} />
        )}
        {activeTab === 'tracking' && (
          <TrackingView
            cameras={cameras}
            onViewEvidence={openDetectionEvidence}
          />
        )}
        {activeTab === 'alerts' && <AlertsView onViewEvidence={openAlertEvidence} />}
        {activeTab === 'settings' && <SettingsView />}
      </div>

      {/* Floating alert toasts */}
      <AlertToast
        alerts={alerts}
        previousCount={prevCount}
        soundEnabled={soundEnabled}
        onViewEvidence={openAlertEvidence}
      />

      {/* Evidence inspection modal */}
      {evidenceItem && (
        <EvidenceModal
          {...(evidenceItem as any)}
          onClose={() => setEvidenceItem(null)}
          onAcknowledged={loadAlerts}
        />
      )}

      {showOnboarding && (
        <OnboardingModal
          onClose={() => setShowOnboarding(false)}
          onCameraAdded={loadCameras}
        />
      )}
      {showWatchlist && (
        <WatchlistManager onClose={() => setShowWatchlist(false)} />
      )}
    </div>
  );
}
