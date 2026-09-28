const BASE = '/api';

export async function fetchCameras(
  params?: Record<string, string>
): Promise<{ success: boolean; count: number; data: import('../types').Camera[] }> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  const res = await fetch(`${BASE}/cameras${qs}`);
  return res.json();
}

export async function fetchTracking(
  plate: string
): Promise<import('../types').TrackingResponse> {
  const res = await fetch(`${BASE}/tracking/${encodeURIComponent(plate)}`);
  return res.json();
}

export async function fetchAlerts(
  params?: Record<string, string>
): Promise<{ success: boolean; count: number; data: import('../types').AlertEntry[] }> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  const res = await fetch(`${BASE}/alerts${qs}`);
  return res.json();
}

export async function fetchWatchlist(
  params?: Record<string, string>
): Promise<{ success: boolean; count: number; data: import('../types').WatchlistEntry[] }> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  const res = await fetch(`${BASE}/watchlist${qs}`);
  return res.json();
}

export async function createWatchlistEntry(
  data: Record<string, string>
): Promise<{ success: boolean; data: import('../types').WatchlistEntry }> {
  const res = await fetch(`${BASE}/watchlist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function onboardCamera(
  data: Record<string, string | number>
): Promise<{ success: boolean; data: import('../types').Camera; error?: { message: string } }> {
  const res = await fetch(`${BASE}/cameras/onboard`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function bulkUploadCameras(
  file: File
): Promise<{
  success: boolean;
  data: import('../types').BulkUploadResult;
  error?: { message: string };
}> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${BASE}/cameras/bulk-upload`, {
    method: 'POST',
    body: form,
  });
  return res.json();
}

export async function acknowledgeDetection(
  id: string
): Promise<{ success: boolean; data: { id: string; alert_status: string } }> {
  const res = await fetch(`${BASE}/detections/${id}/acknowledge`, {
    method: 'PATCH',
  });
  return res.json();
}
