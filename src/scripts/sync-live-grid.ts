/**
 * Sentinel IVMS — Live Camera Grid Sync (Local File)
 * =====================================================
 * Reads cameras.json from the project root (downloaded from the
 * cctv.corp8.cloud portal) and upserts 30 live Gujarat government
 * cameras into the Supabase PostgreSQL/PostGIS database.
 *
 * Usage: npm run sync:grid
 */

import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import sequelize from '../config/database';
import { Camera } from '../models';

// ── RTSP Base (direct IP, bypasses web CDN) ─────────────────────────────
const RTSP_BASE = 'rtsp://funesomya%40gmail.com:Somya14407fune%21@103.250.160.189:8554/stream';

// ── District coordinate mapping (SRID 4326) ─────────────────────────────
// Maps known location keywords to authentic Gujarat lat/lng
interface GeoEntry {
  district: string;
  city: string;
  lat: number;
  lng: number;
  type: 'ANPR' | 'PTZ' | 'Fixed Bullet' | 'Dome' | 'Analog-Encoder';
}

const LOCATION_MAP: Record<string, GeoEntry> = {
  cam01: { district: 'Ahmedabad', city: 'Ahmedabad',   lat: 23.0280, lng: 72.5739, type: 'ANPR' },          // Chimanbhai Bridge
  cam02: { district: 'Ahmedabad', city: 'Ahmedabad',   lat: 23.0330, lng: 72.5610, type: 'PTZ' },           // Janpath
  cam03: { district: 'Ahmedabad', city: 'Ahmedabad',   lat: 23.0390, lng: 72.5660, type: 'Fixed Bullet' },  // ONGC Office
  cam04: { district: 'Ahmedabad', city: 'Ahmedabad',   lat: 23.0134, lng: 72.5624, type: 'ANPR' },          // Paldi Circle
  cam05: { district: 'Ahmedabad', city: 'Ahmedabad',   lat: 23.0780, lng: 72.5340, type: 'PTZ' },           // Visat Teen Rasta
  cam06: { district: 'Junagadh',  city: 'Junagadh',    lat: 21.5195, lng: 70.4633, type: 'ANPR' },          // Timbavadi Gate
  cam07: { district: 'Gir Somnath', city: 'Somnath',   lat: 20.8880, lng: 70.4012, type: 'Fixed Bullet' },  // Hero Showroom
  cam08: { district: 'Junagadh',  city: 'Junagadh',    lat: 21.5222, lng: 70.4579, type: 'ANPR' },          // Majewadi Gate
  cam09: { district: 'Junagadh',  city: 'Junagadh',    lat: 21.5310, lng: 70.4720, type: 'PTZ' },           // New Bypass Circle
  cam10: { district: 'Junagadh',  city: 'Junagadh',    lat: 21.5180, lng: 70.4550, type: 'ANPR' },          // Char Chowk Road
  cam11: { district: 'Junagadh',  city: 'Junagadh',    lat: 21.5240, lng: 70.4610, type: 'Fixed Bullet' },  // Dolatpara
  cam12: { district: 'Gandhinagar', city: 'Adalaj',    lat: 23.1650, lng: 72.5810, type: 'ANPR' },          // Tri Mandir Adalaj Tollnaka
  cam13: { district: 'Ahmedabad', city: 'Ahmedabad',   lat: 23.0400, lng: 72.5500, type: 'Dome' },          // CN Vidhyalaya
  cam14: { district: 'Ahmedabad', city: 'Ahmedabad',   lat: 23.0350, lng: 72.5550, type: 'ANPR' },          // Delight RLVD
  cam15: { district: 'Ahmedabad', city: 'Ahmedabad',   lat: 23.0450, lng: 72.5480, type: 'PTZ' },           // Suvidha Park
  cam16: { district: 'Ahmedabad', city: 'Ahmedabad',   lat: 23.0790, lng: 72.5350, type: 'ANPR' },          // Visat P2
  cam17: { district: 'Rajkot',    city: 'Rajkot',      lat: 22.2826, lng: 70.7828, type: 'PTZ' },           // Rajkot Bus Port
  cam18: { district: 'Rajkot',    city: 'Rajkot',      lat: 22.2974, lng: 70.8131, type: 'ANPR' },          // Rajkot CCTV
  cam19: { district: 'Navsari',   city: 'Gandevi',     lat: 20.8120, lng: 73.0010, type: 'Fixed Bullet' },  // Khaparia GP
  cam20: { district: 'Junagadh',  city: 'Junagadh',    lat: 21.5150, lng: 70.4500, type: 'Dome' },          // Mohanpura
  cam21: { district: 'Patan',     city: 'Patan',       lat: 23.8490, lng: 72.1266, type: 'ANPR' },          // Dethali Char Rasta
  cam22: { district: 'Junagadh',  city: 'Mervada',     lat: 21.4900, lng: 70.4200, type: 'PTZ' },           // BK Mervada
  cam23: { district: 'Junagadh',  city: 'Kheram',      lat: 21.5050, lng: 70.4400, type: 'Fixed Bullet' },  // Kheram
  cam24: { district: 'Gandhinagar', city: 'Dehgam',    lat: 23.3330, lng: 72.8170, type: 'ANPR' },          // Dehgam
  cam25: { district: 'Patan',     city: 'Dhanori',     lat: 23.8200, lng: 72.1500, type: 'PTZ' },           // Dhanori
  cam26: { district: 'Junagadh',  city: 'Tankal',      lat: 21.4800, lng: 70.4100, type: 'Fixed Bullet' },  // Tankal
  cam27: { district: 'Navsari',   city: 'Bilimora',    lat: 20.7698, lng: 72.9661, type: 'ANPR' },          // Bilimora
  cam28: { district: 'Navsari',   city: 'Bilimora',    lat: 20.7710, lng: 72.9680, type: 'ANPR' },          // Bilimora 2
  cam29: { district: 'Navsari',   city: 'Bilimora',    lat: 20.7720, lng: 72.9700, type: 'Fixed Bullet' },  // Bilimora 3
  cam30: { district: 'Kutch',     city: 'Gandhidham',  lat: 23.0753, lng: 70.1337, type: 'PTZ' },           // Gandhidham Rambaugh
};

async function sync() {
  console.log('\n  ╔══════════════════════════════════════════════════╗');
  console.log('  ║  SENTINEL — Live Camera Grid Sync (Local File)  ║');
  console.log('  ╚══════════════════════════════════════════════════╝\n');

  // ── Read local cameras.json ───────────────────────────────────────
  const jsonPath = path.join(__dirname, '..', '..', 'cameras.json');
  if (!fs.existsSync(jsonPath)) {
    console.error(`  ❌ cameras.json not found at: ${jsonPath}`);
    console.error('  💡 Download it from the Sentinel portal and place it in the project root.');
    process.exit(1);
  }

  const raw = fs.readFileSync(jsonPath, 'utf-8');
  const catalogue: { id: string; name: string }[] = JSON.parse(raw);
  console.log(`  📂 Loaded cameras.json: ${catalogue.length} cameras\n`);

  try {
    await sequelize.query('CREATE EXTENSION IF NOT EXISTS postgis;');
    console.log('  ✅ PostGIS extension verified');

    await Camera.sync({ alter: true });
    console.log('  ✅ Camera model synchronized\n');

    let created = 0;
    let updated = 0;

    for (const entry of catalogue) {
      const code = entry.id;   // cam01, cam02, ...
      const geo = LOCATION_MAP[code];

      if (!geo) {
        console.log(`  ⚠️  Skipping unknown camera: ${code} — ${entry.name}`);
        continue;
      }

      // Clean the name: strip leading number prefix "01 ", "02 " etc.
      const cleanName = entry.name.replace(/^\d+\s*/, '').trim() || entry.name;

      const rtspUrl = `${RTSP_BASE}/${code}`;
      const cameraData = {
        camera_code: code,
        department_name: 'Home Department',
        district: geo.district,
        city_or_taluka: geo.city,
        landmark: cleanName,
        camera_type: geo.type,
        status: 'Active' as const,
        rtsp_url: rtspUrl,
        vms_vendor: 'Corp8 Sentinel Grid',
        retention_days: 15,
        resolution: '720p',
        health_status: 'Online' as const,
        location: {
          type: 'Point' as const,
          coordinates: [geo.lng, geo.lat],
        },
      };

      const [existing] = await Camera.findAll({
        where: { camera_code: code },
        limit: 1,
      });

      if (existing) {
        await existing.update(cameraData);
        updated++;
        console.log(`  🔄 Updated: ${code} — ${cleanName}, ${geo.district}`);
      } else {
        await Camera.create(cameraData);
        created++;
        console.log(`  ✅ Created: ${code} — ${cleanName}, ${geo.district}`);
      }
    }

    console.log(`\n  ── Summary ────────────────────────────────────────`);
    console.log(`  📷 Catalogue entries: ${catalogue.length}`);
    console.log(`  ✅ Created: ${created}`);
    console.log(`  🔄 Updated: ${updated}`);
    console.log(`  🔗 RTSP: ${RTSP_BASE}/cam{XX}`);

    const total = await Camera.count();
    console.log(`  📊 Total cameras in database: ${total}\n`);

  } catch (error) {
    console.error('  ❌ Sync failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

sync();
