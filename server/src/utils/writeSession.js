const mongoose = require('mongoose');

/**
 * Run writes in a transaction when a live MongoDB connection is available.
 * Unit tests run without a connection and simply execute the callback.
 */
const withWriteSession = async (callback) => {
  if (mongoose.connection.readyState !== 1) return callback(null);

  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await callback(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
};

module.exports = { withWriteSession };
