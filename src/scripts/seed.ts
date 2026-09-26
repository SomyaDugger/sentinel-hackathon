import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/database';
import { Camera, Watchlist, Detection } from '../models';
import logger from '../utils/logger';

const CAMERAS_SEED = [
  {
    department_name: 'Home Department',
    district: 'Ahmedabad',
    city_or_taluka: 'Ahmedabad City',
    landmark: 'SG Highway - Iscon Cross Roads',
    camera_type: 'ANPR' as const,
    status: 'Active' as const,
    rtsp_url: 'rtsp://10.10.1.101:554/stream1',
    vms_vendor: 'Hikvision',
    retention_days: 15,
    resolution: '4K',
    health_status: 'Online' as const,
    location: { type: 'Point' as const, coordinates: [72.5010, 23.0300] },
  },
  {
    department_name: 'Home Department',
    district: 'Ahmedabad',
    city_or_taluka: 'Ahmedabad City',
    landmark: 'Ashram Road - Income Tax Circle',
    camera_type: 'PTZ' as const,
    status: 'Active' as const,
    rtsp_url: 'rtsp://10.10.1.102:554/stream1',
    vms_vendor: 'Milestone',
    retention_days: 15,
    resolution: '1080p',
    health_status: 'Online' as const,
    location: { type: 'Point' as const, coordinates: [72.5660, 23.0395] },
  },
  {
    department_name: 'Home Department',
    district: 'Gandhinagar',
    city_or_taluka: 'Gandhinagar',
    landmark: 'Sachivalay - State Secretariat Gate',
    camera_type: 'Fixed Bullet' as const,
    status: 'Active' as const,
    rtsp_url: 'rtsp://10.10.2.101:554/stream1',
    vms_vendor: 'Dahua',
    retention_days: 15,
    resolution: '4K',
    health_status: 'Online' as const,
    location: { type: 'Point' as const, coordinates: [72.6369, 23.2156] },
  },
  {
    department_name: 'RTO',
    district: 'Surat',
    city_or_taluka: 'Surat City',
    landmark: 'Ring Road - Dumas Checkpost',
    camera_type: 'ANPR' as const,
    status: 'Active' as const,
    rtsp_url: 'rtsp://10.10.3.101:554/stream1',
    vms_vendor: 'Hikvision',
    retention_days: 10,
    resolution: '1080p',
    health_status: 'Online' as const,
    location: { type: 'Point' as const, coordinates: [72.8311, 21.1702] },
  },
  {
    department_name: 'RTO',
    district: 'Vadodara',
    city_or_taluka: 'Vadodara City',
    landmark: 'Sayajigunj - RTO Office',
    camera_type: 'ANPR' as const,
    status: 'Active' as const,
    rtsp_url: 'rtsp://10.10.4.101:554/stream1',
    vms_vendor: 'Matrix',
    retention_days: 10,
    resolution: '1080p',
    health_status: 'Degraded' as const,
    location: { type: 'Point' as const, coordinates: [73.1812, 22.3072] },
  },
  {
    department_name: 'Home Department',
    district: 'Rajkot',
    city_or_taluka: 'Rajkot City',
    landmark: 'Kalavad Road - Trikon Baug Circle',
    camera_type: 'Dome' as const,
    status: 'Active' as const,
    rtsp_url: 'rtsp://10.10.5.101:554/stream1',
    vms_vendor: 'Custom ONVIF',
    retention_days: 7,
    resolution: '1080p',
    health_status: 'Online' as const,
    location: { type: 'Point' as const, coordinates: [70.8022, 22.3039] },
  },
  {
    department_name: 'Home Department',
    district: 'Jamnagar',
    city_or_taluka: 'Jamnagar City',
    landmark: 'Lal Bungalow - Refinery Bypass',
    camera_type: 'PTZ' as const,
    status: 'Active' as const,
    rtsp_url: 'rtsp://10.10.6.101:554/stream1',
    vms_vendor: 'Milestone',
    retention_days: 7,
    resolution: '4K',
    health_status: 'Online' as const,
    location: { type: 'Point' as const, coordinates: [70.0577, 22.4707] },
  },
  {
    department_name: 'Home Department',
    district: 'Devbhumi Dwarka',
    city_or_taluka: 'Dwarka',
    landmark: 'Dwarka Temple Circle',
    camera_type: 'Fixed Bullet' as const,
    status: 'Active' as const,
    rtsp_url: 'rtsp://10.10.7.101:554/stream1',
    vms_vendor: 'Dahua',
    retention_days: 15,
    resolution: '1080p',
    health_status: 'Online' as const,
    location: { type: 'Point' as const, coordinates: [68.9678, 22.2394] },
  },
  {
    department_name: 'Home Department',
    district: 'Gir Somnath',
    city_or_taluka: 'Somnath',
    landmark: 'Somnath Coastal Highway - Temple Gate',
    camera_type: 'ANPR' as const,
    status: 'Active' as const,
    rtsp_url: 'rtsp://10.10.8.101:554/stream1',
    vms_vendor: 'Hikvision',
    retention_days: 15,
    resolution: '4K',
    health_status: 'Online' as const,
    location: { type: 'Point' as const, coordinates: [70.4013, 20.8880] },
  },
  {
    department_name: 'RTO',
    district: 'Dahod',
    city_or_taluka: 'Dahod',
    landmark: 'RTO Checkpost - NH-56 Entry',
    camera_type: 'ANPR' as const,
    status: 'Active' as const,
    rtsp_url: 'rtsp://10.10.9.101:554/stream1',
    vms_vendor: 'Matrix',
    retention_days: 7,
    resolution: '1080p',
    health_status: 'Online' as const,
    location: { type: 'Point' as const, coordinates: [74.2523, 22.8374] },
  },
  {
    department_name: 'Food & Civil Supplies',
    district: 'Valsad',
    city_or_taluka: 'Valsad',
    landmark: 'NH-48 Toll Plaza',
    camera_type: 'Analog-Encoder' as const,
    status: 'Active' as const,
    rtsp_url: 'rtsp://10.10.10.101:554/stream1',
    vms_vendor: 'Custom ONVIF',
    retention_days: 7,
    resolution: '720p',
    health_status: 'Degraded' as const,
    location: { type: 'Point' as const, coordinates: [72.9342, 20.5992] },
  },
  {
    department_name: 'Home Department',
    district: 'Kutch',
    city_or_taluka: 'Bhuj',
    landmark: 'Bhuj City Gate - NH-341',
    camera_type: 'Dome' as const,
    status: 'Active' as const,
    rtsp_url: 'rtsp://10.10.11.101:554/stream1',
    vms_vendor: 'Hikvision',
    retention_days: 10,
    resolution: '1080p',
    health_status: 'Online' as const,
    location: { type: 'Point' as const, coordinates: [69.6669, 23.2420] },
  },
  {
    department_name: 'Home Department',
    district: 'Porbandar',
    city_or_taluka: 'Porbandar',
    landmark: 'MG Road - Kirti Mandir Junction',
    camera_type: 'PTZ' as const,
    status: 'Active' as const,
    rtsp_url: 'rtsp://10.10.12.101:554/stream1',
    vms_vendor: 'Dahua',
    retention_days: 10,
    resolution: '1080p',
    health_status: 'Online' as const,
    location: { type: 'Point' as const, coordinates: [69.6293, 21.6417] },
  },
  {
    department_name: 'Home Department',
    district: 'Junagadh',
    city_or_taluka: 'Junagadh',
    landmark: 'Girnar Chowk - Bhavnath Road',
    camera_type: 'Fixed Bullet' as const,
    status: 'Inactive' as const,
    rtsp_url: 'rtsp://10.10.13.101:554/stream1',
    vms_vendor: 'Milestone',
    retention_days: 7,
    resolution: '1080p',
    health_status: 'Offline' as const,
    location: { type: 'Point' as const, coordinates: [70.4579, 21.5222] },
  },
  {
    department_name: 'Home Department',
    district: 'Bhavnagar',
    city_or_taluka: 'Bhavnagar',
    landmark: 'Ghogha Circle - Port Road',
    camera_type: 'Dome' as const,
    status: 'Active' as const,
    rtsp_url: 'rtsp://10.10.14.101:554/stream1',
    vms_vendor: 'Hikvision',
    retention_days: 10,
    resolution: '1080p',
    health_status: 'Online' as const,
    location: { type: 'Point' as const, coordinates: [72.1519, 21.7645] },
  },
];

const WATCHLIST_SEED = [
  {
    license_plate: 'GJ01AB1234',
    entity_type: 'Stolen Vehicle',
    alert_priority: 'Critical' as const,
    source_database: 'eGujCop' as const,
    vehicle_make_model: 'Maruti Suzuki Swift Dzire',
    case_reference: 'FIR/AHD/2024/00456',
    notes: 'White sedan stolen from Satellite area, Ahmedabad. Armed suspects.',
  },
  {
    license_plate: 'GJ05CD5678',
    entity_type: 'Wanted Person Vehicle',
    alert_priority: 'High' as const,
    source_database: 'eGujCop' as const,
    vehicle_make_model: 'Hyundai Creta',
    case_reference: 'FIR/SRT/2024/00789',
    notes: 'Vehicle associated with absconding accused in Surat narcotics case.',
  },
  {
    license_plate: 'GJ03EF9012',
    entity_type: 'Stolen Vehicle',
    alert_priority: 'High' as const,
    source_database: 'VAHAN' as const,
    vehicle_make_model: 'Tata Nexon EV',
    case_reference: 'VAHAN/RJ/2024/THEFT/1122',
    notes: 'Inter-state stolen vehicle flagged by Rajasthan RTO. Grey color.',
  },
  {
    license_plate: 'GJ06GH3456',
    entity_type: 'Wanted Person Vehicle',
    alert_priority: 'Critical' as const,
    source_database: 'eGujCop' as const,
    vehicle_make_model: 'Mahindra Scorpio',
    case_reference: 'FIR/VAD/2024/01234',
    notes: 'Black Scorpio used in Vadodara highway robbery. Multiple accused.',
  },
  {
    license_plate: 'GJ18JK7890',
    entity_type: 'Suspicious Vehicle',
    alert_priority: 'Medium' as const,
    source_database: 'SARTHI' as const,
    vehicle_make_model: 'Ashok Leyland Truck',
    case_reference: 'SARTHI/GJ/2024/OVL/556',
    notes: 'Overloaded commercial vehicle with expired fitness certificate. Food & Civil Supplies flagged.',
  },
];

async function seed(): Promise<void> {
  try {
    await sequelize.authenticate();
    logger.info('Database connected for seeding');

    // Ensure PostGIS extension is available
    await sequelize.query('CREATE EXTENSION IF NOT EXISTS postgis;');
    logger.info('PostGIS extension verified');

    // Sync all models (force: true recreates tables — use only in dev)
    await sequelize.sync({ force: true });
    logger.info('Tables recreated');

    // Seed cameras
    const cameras = await Camera.bulkCreate(CAMERAS_SEED, { validate: true });
    logger.info(`Seeded ${cameras.length} cameras across Gujarat`);

    // Seed watchlist
    const watchlistEntries = await Watchlist.bulkCreate(WATCHLIST_SEED, {
      validate: true,
    });
    logger.info(`Seeded ${watchlistEntries.length} watchlist entries`);

    // Seed sample detections to demonstrate route tracking
    const cameraIds = cameras.map((c) => c.id);
    const watchlistIds = watchlistEntries.map((w) => w.id);

    const now = new Date();
    const detectionsSeed = [
      {
        camera_id: cameraIds[0], // SG Highway Ahmedabad
        license_plate: 'GJ01AB1234',
        confidence: 0.96,
        snapshot_url: '/snapshots/det_001.jpg',
        detected_at: new Date(now.getTime() - 3 * 60 * 60 * 1000), // 3 hours ago
        is_watchlist_match: true,
        watchlist_id: watchlistIds[0],
        alert_status: 'New' as const,
      },
      {
        camera_id: cameraIds[3], // Surat Ring Road
        license_plate: 'GJ01AB1234',
        confidence: 0.91,
        snapshot_url: '/snapshots/det_002.jpg',
        detected_at: new Date(now.getTime() - 1.5 * 60 * 60 * 1000), // 1.5 hours ago
        is_watchlist_match: true,
        watchlist_id: watchlistIds[0],
        alert_status: 'New' as const,
      },
      {
        camera_id: cameraIds[10], // Valsad NH-48
        license_plate: 'GJ01AB1234',
        confidence: 0.88,
        snapshot_url: '/snapshots/det_003.jpg',
        detected_at: new Date(now.getTime() - 30 * 60 * 1000), // 30 min ago
        is_watchlist_match: true,
        watchlist_id: watchlistIds[0],
        alert_status: 'New' as const,
      },
      {
        camera_id: cameraIds[4], // Vadodara RTO
        license_plate: 'GJ06GH3456',
        confidence: 0.94,
        snapshot_url: '/snapshots/det_004.jpg',
        detected_at: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
        is_watchlist_match: true,
        watchlist_id: watchlistIds[3],
        alert_status: 'Acknowledged' as const,
      },
      {
        camera_id: cameraIds[5], // Rajkot
        license_plate: 'GJ27XY4455',
        confidence: 0.82,
        snapshot_url: '/snapshots/det_005.jpg',
        detected_at: new Date(now.getTime() - 4 * 60 * 60 * 1000),
        is_watchlist_match: false,
        watchlist_id: null,
        alert_status: 'New' as const,
      },
    ];

    const detections = await Detection.bulkCreate(detectionsSeed, {
      validate: true,
    });
    logger.info(`Seeded ${detections.length} sample detections`);

    logger.info('\n=== Seed Summary ===');
    logger.info(`  Cameras:    ${cameras.length}`);
    logger.info(`  Watchlist:  ${watchlistEntries.length}`);
    logger.info(`  Detections: ${detections.length}`);
    logger.info('====================\n');
    logger.info('Seed completed successfully!');

    process.exit(0);
  } catch (error) {
    logger.error('Seed failed:', error);
    process.exit(1);
  }
}

seed();
