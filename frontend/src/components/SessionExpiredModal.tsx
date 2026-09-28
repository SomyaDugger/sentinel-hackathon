import { useState } from 'react';

interface SessionExpiredModalProps {
  onClose: () => void;
  onCookieUpdated: () => void;
}

export default function SessionExpiredModal({
  onClose,
  onCookieUpdated,
}: SessionExpiredModalProps) {
  const [cookie, setCookie] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async () => {
    if (!cookie.trim() || cookie.trim().length < 10) {
      setErrorMsg('Please paste a valid sentinel session cookie.');
      setStatus('error');
      return;
    }

    setStatus('submitting');
    setErrorMsg('');

    try {
      const resp = await fetch('/api/settings/cookie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cookie: cookie.trim() }),
      });
      const data = await resp.json();

      if (data.success) {
        setStatus('success');
        setTimeout(() => {
          onCookieUpdated();
          onClose();
        }, 800);
      } else {
        setErrorMsg(data.error || 'Failed to update cookie');
        setStatus('error');
      }
    } catch (err) {
      setErrorMsg('Network error — is the backend running?');
      setStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-600 rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-900/60 to-slate-800 px-6 py-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-600/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-red-300">
                Government CDN Session Expired
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                AES-128 encrypted feeds require a valid portal session
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-slate-300 leading-relaxed">
            The <span className="text-amber-400 font-mono text-xs">sentinel</span> session cookie 
            from <span className="text-blue-400">cctv.corp8.cloud</span> has expired.
            To restore live AES-128 decrypted feeds:
          </p>

          <ol className="text-xs text-slate-400 space-y-1.5 pl-4 list-decimal">
            <li>Log into <span className="text-blue-400 font-mono">https://cctv.corp8.cloud</span></li>
            <li>Open DevTools → <span className="text-slate-300">Application</span> → <span className="text-slate-300">Cookies</span></li>
            <li>Copy the <span className="text-amber-400 font-mono">sentinel</span> cookie value</li>
            <li>Paste it below and click <span className="text-green-400">Update & Reconnect</span></li>
          </ol>

          {/* Input */}
          <div>
            <label className="block text-xs text-slate-500 mb-1.5 font-medium">
              Session Cookie Value
            </label>
            <input
              type="text"
              value={cookie}
              onChange={(e) => {
                setCookie(e.target.value);
                if (status === 'error') setStatus('idle');
              }}
              placeholder="eyJ1aWQiOi..."
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2.5 text-sm text-slate-200 font-mono placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          {/* Status messages */}
          {status === 'error' && errorMsg && (
            <div className="flex items-center gap-2 text-red-400 text-xs bg-red-900/20 rounded-lg px-3 py-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              {errorMsg}
            </div>
          )}
          {status === 'success' && (
            <div className="flex items-center gap-2 text-green-400 text-xs bg-green-900/20 rounded-lg px-3 py-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Cookie updated — reconnecting feeds…
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-850 border-t border-slate-700 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            Dismiss
          </button>
          <button
            onClick={handleSubmit}
            disabled={status === 'submitting' || status === 'success'}
            className="px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            {status === 'submitting' ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Updating…
              </>
            ) : status === 'success' ? (
              '✓ Updated'
            ) : (
              '🔄 Update & Reconnect'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
