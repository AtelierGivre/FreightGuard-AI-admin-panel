/**
 * Serverless entry point for Vercel.
 *
 * The local entry point (`src/localServer.js`) connects to MongoDB before
 * calling listen(). A serverless function has no long-lived startup phase, so
 * this entry exports the Express app with a DB-readiness middleware installed
 * before every route. The connection promise is cached per function instance.
 */
const createApp = require('./createApp');
const connectDB = require('./config/database');

let dbReady;

const ensureDb = async (req, res, next) => {
  try {
    if (!dbReady) dbReady = connectDB();
    await dbReady;
    next();
  } catch (error) {
    // Allow the next invocation to retry instead of reusing a failed promise.
    dbReady = undefined;
    next(error);
  }
};

module.exports = createApp({ beforeRoutes: [ensureDb] });
