import { Router, Request, Response } from 'express';
import axios from 'axios';
import https from 'https';
import { Readable } from 'stream';
import logger from '../utils/logger';

const router = Router();

// ── Credentials (env overridable, team defaults as fallback) ────────────
const CCTV_EMAIL = process.env.CCTV_EMAIL || 'funesomya@gmail.com';
const CCTV_PASSWORD = process.env.CCTV_PASSWORD || 'Somya14407fune!';

// ── Mutable session cookie (hot-swappable via auto-refresh or manual POST) ──
let activeSessionCookie =
  'sentinel=eyJ1aWQiOiJhMTc4N2IyNTJjZDRlYTAxIiwic2lkIjoiZmNjNjhhYTk3NDFiYzEyODE2In0.NAEjL54FOgHZBVdimNLiylkmE56EfzQ1cnIJmoxzcWA';

/** Called by the settings route or auto-refresh to hot-swap the cookie. */
export function setSessionCookie(newCookie: string): void {
  activeSessionCookie = newCookie;
  logger.info('Session cookie updated at runtime');
}

export function getSessionCookie(): string {
  return activeSessionCookie;
}

const UPSTREAM = 'https://cctv.corp8.cloud';
const LOGIN_URL = `${UPSTREAM}/auth/login`;

// Persistent HTTPS agent
const keepAliveAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 50,
  keepAliveMsecs: 30000,
  timeout: 20000,
});

/** Build headers dynamically so they always use the latest cookie. */
function proxyHeaders() {
  return {
    Cookie: activeSessionCookie,
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Referer: `${UPSTREAM}/`,
    Accept: '*/*',
    Connection: 'keep-alive',
  };
}

const SEGMENT_MAX_RETRIES = 3;
const SEGMENT_RETRY_DELAY_MS = 500;

// ── Automated Silent Re-authentication ──────────────────────────────────

/** Mutex to prevent concurrent re-auth attempts. */
let refreshInProgress: Promise<string | null> | null = null;

/**
 * Performs a form-POST login to the government portal,
 * extracts the sentinel cookie from set-cookie, and updates the global.
 */
async function refreshCctvCookie(): Promise<string | null> {
  // Coalesce concurrent 403s into a single login attempt
  if (refreshInProgress) return refreshInProgress;

  refreshInProgress = (async () => {
    logger.info('Attempting silent CCTV session re-authentication...');
    try {
      const body = new URLSearchParams({
        email: CCTV_EMAIL,
        password: CCTV_PASSWORD,
      }).toString();

      const resp = await axios.post(LOGIN_URL, body, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Referer: `${UPSTREAM}/`,
        },
        httpsAgent: keepAliveAgent,
        maxRedirects: 5,
        validateStatus: (s) => s < 400 || s === 302 || s === 301,
      });

      // Extract sentinel cookie from set-cookie header(s)
      const setCookies = resp.headers['set-cookie'];
      if (setCookies) {
        for (const sc of setCookies) {
          const match = sc.match(/sentinel=([^;]+)/);
          if (match) {
            const newCookie = `sentinel=${match[1]}`;
            activeSessionCookie = newCookie;
            logger.info('CCTV session cookie successfully auto-refreshed');
            return newCookie;
          }
        }
      }

      logger.warn('Login succeeded but no sentinel cookie in response headers');
      return null;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`CCTV auto-login failed: ${msg}`);
      return null;
    } finally {
      refreshInProgress = null;
    }
  })();

  return refreshInProgress;
}

// ── Helper: fetch with single 403 auto-retry ────────────────────────────

interface UpstreamOptions {
  url: string;
  responseType: 'text' | 'arraybuffer' | 'stream';
  timeout?: number;
}

async function fetchWithAutoRetry(opts: UpstreamOptions) {
  const { url, responseType, timeout = 15000 } = opts;

  // First attempt
  let resp = await axios.get(url, {
    responseType,
    timeout,
    headers: proxyHeaders(),
    httpsAgent: keepAliveAgent,
    validateStatus: () => true,
  });

  // If 403, try re-auth once and retry
  if (resp.status === 403) {
    logger.warn(`Upstream returned 403. Attempting silent re-authentication...`);
    const refreshed = await refreshCctvCookie();
    if (refreshed) {
      resp = await axios.get(url, {
        responseType,
        timeout,
        headers: proxyHeaders(),
        httpsAgent: keepAliveAgent,
        validateStatus: () => true,
      });
    }
  }

  return resp;
}

// ── Routes ──────────────────────────────────────────────────────────────

/**
 * GET /api/stream/:camId/index.m3u8
 */
router.get('/:camId/index.m3u8', async (req: Request, res: Response) => {
  const { camId } = req.params;
  const upstreamUrl = `${UPSTREAM}/${camId}/index.m3u8`;

  try {
    const resp = await fetchWithAutoRetry({ url: upstreamUrl, responseType: 'text' });

    if (resp.status !== 200) {
      res.status(resp.status).json({ success: false, error: `Upstream ${resp.status}` });
      return;
    }

    let manifest: string = resp.data as string;

    manifest = manifest.replace(
      /URI="([^"]*enc\.key[^"]*)"/g,
      `URI="http://localhost:3000/api/stream/${camId}/enc.key"`
    );

    manifest = manifest.replace(
      /^(?!#)(\S+\.ts\S*)$/gm,
      (match) => {
        const filename = match.split('/').pop() || match;
        return `http://localhost:3000/api/stream/${camId}/${filename}`;
      }
    );

    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Cache-Control', 'no-cache, no-store');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(manifest);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`m3u8 proxy error: ${msg}`);
    if (!res.headersSent) res.status(502).json({ success: false, error: msg });
  }
});

/**
 * GET /api/stream/:camId/enc.key
 */
router.get('/:camId/enc.key', async (req: Request, res: Response) => {
  const { camId } = req.params;
  const urls = [
    `${UPSTREAM}/${camId}/enc.key`,
    `${UPSTREAM}/enc.key`,
  ];

  for (const url of urls) {
    try {
      const resp = await fetchWithAutoRetry({ url, responseType: 'arraybuffer', timeout: 10000 });

      if (resp.status === 200) {
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.send(Buffer.from(resp.data as ArrayBuffer));
        return;
      }
    } catch {
      // try next URL
    }
  }

  logger.warn(`enc.key not found for ${camId}`);
  res.status(404).json({ success: false, error: 'Encryption key not found' });
});

/**
 * GET /api/stream/:camId/:segment
 * Proxies .ts segments with retry for ECONNRESET + auto-reauth on 403.
 */
router.get('/:camId/:segment', async (req: Request, res: Response) => {
  const { camId, segment } = req.params;
  const upstreamUrl = `${UPSTREAM}/${camId}/${segment}`;

  const contentType = segment.endsWith('.ts')
    ? 'video/MP2T'
    : segment.endsWith('.m3u8')
      ? 'application/vnd.apple.mpegurl'
      : 'application/octet-stream';

  let lastErr = '';
  let didReauth = false;

  for (let attempt = 1; attempt <= SEGMENT_MAX_RETRIES; attempt++) {
    try {
      const resp = await axios.get(upstreamUrl, {
        responseType: 'stream',
        timeout: 15000,
        headers: proxyHeaders(),
        httpsAgent: keepAliveAgent,
        validateStatus: () => true,
      });

      if (resp.status === 403 && !didReauth) {
        didReauth = true;
        logger.warn(`Segment 403 — attempting silent re-authentication...`);
        const refreshed = await refreshCctvCookie();
        if (refreshed) continue; // retry with new cookie
        res.status(403).json({ success: false, error: 'Session expired' });
        return;
      }

      if (resp.status !== 200) {
        lastErr = `Upstream ${resp.status}`;
        if (attempt < SEGMENT_MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, SEGMENT_RETRY_DELAY_MS * attempt));
          continue;
        }
        res.status(resp.status).json({ success: false, error: lastErr });
        return;
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'no-cache, no-store');
      res.setHeader('Access-Control-Allow-Origin', '*');
      (resp.data as Readable).pipe(res);
      return;
    } catch (err: unknown) {
      lastErr = err instanceof Error ? err.message : String(err);
      logger.warn(`Segment ${segment} attempt ${attempt}/${SEGMENT_MAX_RETRIES} failed: ${lastErr}`);
      if (attempt < SEGMENT_MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, SEGMENT_RETRY_DELAY_MS * attempt));
      }
    }
  }

  logger.error(`Segment proxy failed after ${SEGMENT_MAX_RETRIES} attempts (${segment}): ${lastErr}`);
  if (!res.headersSent) {
    res.status(502).json({ success: false, error: `Segment fetch failed: ${lastErr}` });
  }
});

export default router;
