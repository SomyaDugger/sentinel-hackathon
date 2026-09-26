import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import logger from '../utils/logger';

dotenv.config();

const databaseUrl =
  process.env.DATABASE_URL ||
  'postgresql://postgres:password@localhost:5432/sentinel_ivms';

const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  logging: (msg) => logger.debug(msg),
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
  pool: {
    max: 20,
    min: 5,
    acquire: 30000,
    idle: 10000,
  },
});

export default sequelize;
