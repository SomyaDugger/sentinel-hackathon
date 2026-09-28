import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

interface HlsPlayerProps {
  src: string;
  className?: string;
  cameraCode?: string;
  cameraName?: string;
  onSessionExpired?: () => void;
}

export default function HlsPlayer({
  src,
  className = '',
  cameraCode,
  cameraName,
  onSessionExpired,
}: HlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const networkRetryCountRef = useRef(0);
  const [status, setStatus] = useState<'connecting' | 'live' | 'error'>('connecting');

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    networkRetryCountRef.current = 0;

    if (Hls.isSupported()) {
      const hls = new Hls({
        maxBufferLength: 10,
        maxMaxBufferLength: 30,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 6,
        enableWorker: true,

        // ── Aggressive retry config for unstable govt CDN ──
        manifestLoadingMaxRetry: 5,
        manifestLoadingRetryDelay: 1000,
        manifestLoadingMaxRetryTimeout: 15000,
        levelLoadingMaxRetry: 5,
        levelLoadingRetryDelay: 1000,
        levelLoadingMaxRetryTimeout: 15000,
        fragLoadingMaxRetry: 5,
        fragLoadingRetryDelay: 1000,
        fragLoadingMaxRetryTimeout: 15000,
      });

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setStatus('live');
        networkRetryCountRef.current = 0;
        video.play().catch(() => {});
      });

      hls.on(Hls.Events.FRAG_LOADED, () => {
        // Reset retry counter on every successful fragment
        if (status !== 'live') setStatus('live');
        networkRetryCountRef.current = 0;
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              networkRetryCountRef.current += 1;
              console.warn(
                `[HLS] Network error on ${cameraCode} (attempt ${networkRetryCountRef.current}/8):`,
                data.details
              );
              if (networkRetryCountRef.current <= 8) {
                // Aggressive: immediately retry loading
                hls.startLoad();
              } else {
                console.error(`[HLS] ${cameraCode} exhausted network retries — marking offline`);
                setStatus('error');
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn(`[HLS] Media error on ${cameraCode}, recovering...`);
              hls.recoverMediaError();
              break;
            default:
              console.error(`[HLS] Fatal error on ${cameraCode}:`, data.details);
              setStatus('error');
              break;
          }
        } else if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          // Non-fatal network hiccup — just log it
          console.debug(`[HLS] Non-fatal network hiccup on ${cameraCode}:`, data.details);
        }
      });

      hls.loadSource(src);
      hls.attachMedia(video);
      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      video.addEventListener('loadedmetadata', () => {
        setStatus('live');
        video.play().catch(() => {});
      });
    } else {
      setStatus('error');
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src, cameraCode]);

  return (
    <div className={`relative bg-black ${className}`}>
      {/* Video element — hidden when offline */}
      <video
        ref={videoRef}
        muted
        autoPlay
        playsInline
        className={`w-full h-full object-contain ${status === 'error' ? 'hidden' : ''}`}
      />

      {/* ── Offline fallback UI ─────────────────────────── */}
      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/95">
          {/* Red alert icon */}
          <div className="w-10 h-10 rounded-full bg-red-900/50 flex items-center justify-center mb-2">
            <svg
              className="w-5 h-5 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18.364 5.636a9 9 0 11-12.728 0M12 9v4m0 4h.01"
              />
            </svg>
          </div>
          <span className="text-red-400 text-xs font-bold tracking-wide">CAMERA OFFLINE</span>
          {cameraCode && (
            <span className="text-slate-500 text-[10px] mt-1 font-mono">
              {cameraCode.toUpperCase()}
            </span>
          )}
          <span className="text-slate-600 text-[9px] mt-2">Feed unavailable — CDN timeout</span>
        </div>
      )}

      {/* ── Status indicator badges ────────────────────── */}
      <div className="absolute top-2 left-2 flex items-center gap-1.5">
        {status === 'live' && (
          <span className="flex items-center gap-1 bg-red-600 text-white text-[10px] px-2 py-0.5 rounded font-bold">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            LIVE GOVT FEED
          </span>
        )}
        {status === 'connecting' && (
          <span className="bg-amber-600 text-white text-[10px] px-2 py-0.5 rounded font-bold animate-pulse">
            CONNECTING…
          </span>
        )}
      </div>

      {/* Camera code */}
      {cameraCode && status !== 'error' && (
        <div className="absolute top-2 right-2 bg-black/70 text-green-400 text-[10px] font-mono px-2 py-0.5 rounded">
          {cameraCode.toUpperCase()}
        </div>
      )}

      {/* Camera name */}
      {cameraName && status !== 'error' && (
        <div className="absolute bottom-2 left-2 bg-black/70 text-slate-300 text-[10px] px-2 py-0.5 rounded truncate max-w-[200px]">
          {cameraName}
        </div>
      )}

      <div className="absolute inset-0 pointer-events-none cctv-scanlines" />
    </div>
  );
}
