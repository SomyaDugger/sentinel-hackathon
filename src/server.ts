import app from './app';
import sequelize from './config/database';
import logger from './utils/logger';
import fs from 'fs';

// Import models to register associations before sync
import './models';

const PORT = parseInt(process.env.PORT || '3000', 10);

// Ensure required directories exist
['uploads', 'logs'].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

async function start(): Promise<void> {
  try {
    // Test database connection
    await sequelize.authenticate();
    logger.info('PostgreSQL connection established');

    // Ensure PostGIS extension is available
    await sequelize.query('CREATE EXTENSION IF NOT EXISTS postgis;');
    logger.info('PostGIS extension verified');

    // Sync models (creates tables if they don't exist)
    await sequelize.sync({ alter: true });
    logger.info('Database models synchronized');

    // Start HTTP server
    app.listen(PORT, () => {
      logger.info(`Sentinel IVMS API running on http://localhost:${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
