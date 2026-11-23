const createApp = require('./createApp');
const config = require('./config/env');
const connectDB = require('./config/database');

/**
 * Application entry point: connect to MongoDB, then start the HTTP server.
 * Run with `npm run dev` (nodemon) or `npm start`.
 */
const start = async () => {
  try {
    await connectDB();

    const app = createApp();
    app.listen(config.port, () => {
      console.log(`[server] FreightGuard AI API listening on http://localhost:${config.port}`);
    });
  } catch (error) {
    console.error('[server] Failed to start:', error.message);
    process.exitCode = 1;
  }
};

start();
