const mongoose = require('mongoose');
const config = require('./env');

/**
 * Establish the MongoDB connection.
 *
 * Throws on failure instead of calling process.exit() so the entry point and
 * tests can decide how to handle it.
 *
 * @returns {Promise<typeof mongoose>}
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[db] MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`[db] MongoDB connection error: ${error.message}`);
    throw error;
  }
};

module.exports = connectDB;
