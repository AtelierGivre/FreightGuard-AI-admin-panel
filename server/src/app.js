const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./config/database');
const config = require('./config/env');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// Security & middleware
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
if (config.nodeEnv === 'development') app.use(morgan('dev'));

// Health check
app.get('/api/health', (req, res) => res.json({ success: true, message: 'FreightGuard AI API is running' }));

// API routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/contracts', require('./routes/contractRoutes'));
app.use('/api/invoices', require('./routes/invoiceRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// 404 handler
app.use((req, res) => res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` }));

// Global error handler
app.use(errorHandler);

connectDB().then(() => {
  app.listen(config.port, () => {
    console.log(`FreightGuard AI server running on http://localhost:${config.port}`);
  });
});

module.exports = app;
