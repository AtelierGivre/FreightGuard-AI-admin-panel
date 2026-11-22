require('dotenv').config();

const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/freightguard',
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-only-secret-change-me',
    expire: process.env.JWT_EXPIRE || '7d',
  },
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@freightguard.ai',
    password: process.env.ADMIN_PASSWORD || 'Admin@12345',
  },
};

module.exports = config;
