/**
 * Centralised, validated environment configuration.
 *
 * Every module reads settings from here instead of `process.env` directly.
 * This keeps defaults in one place and fails fast on unsafe production config.
 */
require('dotenv').config();

const { DEFAULT_FEE_PCT } = require('./constants');

const isProduction = process.env.NODE_ENV === 'production';
const jwtSecret = process.env.JWT_SECRET || 'dev-only-secret-change-me';

if (isProduction && jwtSecret === 'dev-only-secret-change-me') {
  throw new Error('JWT_SECRET must be set to a strong random value in production.');
}

const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';

if (isProduction && !process.env.CLIENT_URL) {
  console.warn('[config] CLIENT_URL is not set; CORS will only allow http://localhost:3000.');
}

const config = Object.freeze({
  port: Number(process.env.PORT || 5000),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction,
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/freightguard',
  clientUrl,
  jwt: {
    secret: jwtSecret,
    expire: process.env.JWT_EXPIRE || '7d',
  },
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@freightguard.ai',
    password: process.env.ADMIN_PASSWORD || 'Admin@12345',
  },
  defaultFeePct: DEFAULT_FEE_PCT,
});

module.exports = config;
