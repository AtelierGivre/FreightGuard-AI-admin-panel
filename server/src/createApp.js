const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config/env');
const { errorHandler, notFound } = require('./middleware/errorHandler');

/**
 * Build and configure the Express application.
 *
 * Deliberately does NOT connect to MongoDB or start listening here. That is the
 * job of `localServer.js`, which keeps this module safe to import from tests.
 *
 * @param {{ beforeRoutes?: import('express').RequestHandler[] }} [options]
 * @returns {import('express').Express}
 */
const createApp = ({ beforeRoutes = [] } = {}) => {
  const app = express();

  // --- Security and request parsing -----------------------------------------
  app.use(helmet());
  app.use(cors({ origin: config.clientUrl, credentials: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  if (!config.isProduction) app.use(morgan('dev'));

  // Optional middleware (for example DB readiness in serverless) must run
  // before the routers are registered.
  beforeRoutes.forEach((middleware) => app.use(middleware));

  // --- Routes ---------------------------------------------------------------
  app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'FreightGuard AI API is running' });
  });

  app.use('/api/auth', require('./routes/authRoutes'));
  app.use('/api/contracts', require('./routes/contractRoutes'));
  app.use('/api/invoices', require('./routes/invoiceRoutes'));
  app.use('/api/disputes', require('./routes/disputeRoutes'));
  app.use('/api/recoveries', require('./routes/recoveryRoutes'));
  app.use('/api/dashboard', require('./routes/dashboardRoutes'));
  app.use('/api/admin', require('./routes/adminRoutes'));

  // --- Fall-through handlers ------------------------------------------------
  app.use(notFound);
  app.use(errorHandler);

  return app;
};

module.exports = createApp;
