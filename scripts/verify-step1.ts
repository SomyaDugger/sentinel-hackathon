/**
 * Sentinel IVMS — Step 1 Verification Script
 *
 * Starts the Express server, runs all endpoint checks against it,
 * prints a pass/fail table, then shuts down.
 */
import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import fs from 'fs';
import path from 'path';
import app from '../src/app';
import sequelize from '../src/config/database';
import '../src/models';

const PORT = 3999; // Use a non-conflicting port for verification
const BASE = `http://localhost:${PORT}`;

interface TestResult {
  name: string;
  endpoint: string;
  status: 'PASS' | 'FAIL';
  detail: string;
}

// ── HTTP helpers ────────────────────────────────────────────────────────
function httpGet(urlPath: string): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    http.get(`${BASE}${urlPath}`, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode || 0, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode || 0, body: data });
        }
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

function httpPostJson(
  urlPath: string,
  payload: object
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const jsonStr = JSON.stringify(payload);
    const req = http.request(
      `${BASE}${urlPath}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(jsonStr),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode || 0, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode || 0, body: data });
          }
        });
        res.on('error', reject);
      }
    );
    req.on('error', reject);
    req.write(jsonStr);
    req.end();
  });
}

function httpPostMultipart(
  urlPath: string,
  filePath: string,
  fieldName: string
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const boundary = '----SentinelVerify' + Date.now();
    const fileContent = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);

    const preamble = Buffer.from(
      `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="${fieldName}"; filename="${fileName}"\r\n` +
        `Content-Type: text/csv\r\n\r\n`
    );
    const epilogue = Buffer.from(`\r\n--${boundary}--\r\n`);
    const body = Buffer.concat([preamble, fileContent, epilogue]);

    const req = http.request(
      `${BASE}${urlPath}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': body.length,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode || 0, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode || 0, body: data });
          }
        });
        res.on('error', reject);
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── Test cases ──────────────────────────────────────────────────────────
async function runTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  // 1. Health check
  try {
    const r = await httpGet('/api/health');
    results.push({
      name: 'Health Check',
      endpoint: 'GET /api/health',
      status: r.status === 200 && r.body.success ? 'PASS' : 'FAIL',
      detail: r.status === 200 ? r.body.message : `HTTP ${r.status}`,
    });
  } catch (e: any) {
    results.push({
      name: 'Health Check',
      endpoint: 'GET /api/health',
      status: 'FAIL',
      detail: e.message,
    });
  }

  // 2. GET /api/cameras — verify seeded cameras
  try {
    const r = await httpGet('/api/cameras');
    const count = r.body.count || 0;
    results.push({
      name: 'List Cameras (seeded)',
      endpoint: 'GET /api/cameras',
      status: r.status === 200 && count >= 15 ? 'PASS' : 'FAIL',
      detail: `${count} cameras returned`,
    });
  } catch (e: any) {
    results.push({
      name: 'List Cameras (seeded)',
      endpoint: 'GET /api/cameras',
      status: 'FAIL',
      detail: e.message,
    });
  }

  // 3. Spatial radius query — Ahmedabad 50km
  try {
    const r = await httpGet('/api/cameras?lat=23.03&lng=72.57&radius=50000');
    const count = r.body.count || 0;
    results.push({
      name: 'Spatial Query (Ahmedabad 50km)',
      endpoint: 'GET /api/cameras?lat=23.03&lng=72.57&radius=50000',
      status: r.status === 200 && count >= 1 && count < 15 ? 'PASS' : 'FAIL',
      detail: `${count} cameras within 50km of Ahmedabad`,
    });
  } catch (e: any) {
    results.push({
      name: 'Spatial Query (Ahmedabad 50km)',
      endpoint: 'GET /api/cameras?lat=...&lng=...&radius=...',
      status: 'FAIL',
      detail: e.message,
    });
  }

  // 4. Bulk upload CSV
  try {
    const csvPath = path.resolve('sample_cameras_gujarat.csv');
    if (!fs.existsSync(csvPath)) {
      results.push({
        name: 'Bulk CSV Upload',
        endpoint: 'POST /api/cameras/bulk-upload',
        status: 'FAIL',
        detail: 'sample_cameras_gujarat.csv not found',
      });
    } else {
      const r = await httpPostMultipart(
        '/api/cameras/bulk-upload',
        csvPath,
        'file'
      );
      const created = r.body?.data?.successfully_created || 0;
      results.push({
        name: 'Bulk CSV Upload',
        endpoint: 'POST /api/cameras/bulk-upload',
        status: r.status === 201 && created > 0 ? 'PASS' : 'FAIL',
        detail: `${created} cameras bulk-created`,
      });
    }
  } catch (e: any) {
    results.push({
      name: 'Bulk CSV Upload',
      endpoint: 'POST /api/cameras/bulk-upload',
      status: 'FAIL',
      detail: e.message,
    });
  }

  // 5. Vehicle tracking — GJ01AB1234
  try {
    const r = await httpGet('/api/tracking/GJ01AB1234');
    const total = r.body.total_detections || 0;
    const hasRoute = r.body.route && r.body.route.length > 0;
    const hasCoords =
      hasRoute && r.body.route[0]?.camera?.coordinates?.latitude;
    results.push({
      name: 'Vehicle Route Tracking',
      endpoint: 'GET /api/tracking/GJ01AB1234',
      status:
        r.status === 200 && total >= 3 && hasCoords ? 'PASS' : 'FAIL',
      detail: `${total} detections, coordinates ${hasCoords ? 'present' : 'missing'}`,
    });
  } catch (e: any) {
    results.push({
      name: 'Vehicle Route Tracking',
      endpoint: 'GET /api/tracking/GJ01AB1234',
      status: 'FAIL',
      detail: e.message,
    });
  }

  // 6. Alerts — Critical priority
  try {
    const r = await httpGet('/api/alerts?priority=Critical');
    const count = r.body.count || 0;
    results.push({
      name: 'Watchlist Alerts (Critical)',
      endpoint: 'GET /api/alerts?priority=Critical',
      status: r.status === 200 && count >= 1 ? 'PASS' : 'FAIL',
      detail: `${count} critical alerts`,
    });
  } catch (e: any) {
    results.push({
      name: 'Watchlist Alerts (Critical)',
      endpoint: 'GET /api/alerts?priority=Critical',
      status: 'FAIL',
      detail: e.message,
    });
  }

  return results;
}

// ── Table printer ───────────────────────────────────────────────────────
function printTable(results: TestResult[]): void {
  const nameW = 32;
  const endpointW = 52;
  const statusW = 8;
  const detailW = 40;

  const sep = `${'─'.repeat(nameW)}┼${'─'.repeat(endpointW)}┼${'─'.repeat(statusW)}┼${'─'.repeat(detailW)}`;

  console.log('\n');
  console.log(
    '═'.repeat(nameW + endpointW + statusW + detailW + 3)
  );
  console.log(
    '  SENTINEL IVMS — STEP 1 VERIFICATION REPORT'
  );
  console.log(
    '═'.repeat(nameW + endpointW + statusW + detailW + 3)
  );
  console.log(
    `${'Test'.padEnd(nameW)}│${'Endpoint'.padEnd(endpointW)}│${'Status'.padEnd(statusW)}│${'Detail'.padEnd(detailW)}`
  );
  console.log(sep);

  for (const r of results) {
    const icon = r.status === 'PASS' ? '✅' : '❌';
    console.log(
      `${r.name.padEnd(nameW)}│${r.endpoint.padEnd(endpointW)}│${(icon + ' ' + r.status).padEnd(statusW + 2)}│${r.detail.substring(0, detailW)}`
    );
  }

  console.log(sep);
  const passed = results.filter((r) => r.status === 'PASS').length;
  const total = results.length;
  console.log(
    `\n  Result: ${passed}/${total} checks passed ${passed === total ? '🎉' : '⚠️'}\n`
  );
}

// ── Main ────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  // Ensure required dirs
  ['uploads', 'logs'].forEach((dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  // Connect DB + sync
  await sequelize.authenticate();
  await sequelize.query('CREATE EXTENSION IF NOT EXISTS postgis;');
  await sequelize.sync({ alter: true });

  // Start server
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(PORT, resolve));
  console.log(`\n  Verification server started on port ${PORT}\n`);

  // Run all tests
  const results = await runTests();

  // Print results table
  printTable(results);

  // Cleanup
  server.close();
  await sequelize.close();
  process.exit(results.every((r) => r.status === 'PASS') ? 0 : 1);
}

main().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
