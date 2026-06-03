require('dotenv').config();
const app = require('./app');
const { connectDB, disconnectDB } = require('./config/database');
const logger = require('./config/logger');

const PORT = process.env.PORT || 5000;

// ============================================================
// UNHANDLED REJECTIONS & EXCEPTIONS
// ============================================================
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION! Shutting down...', { error: err.message, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('UNHANDLED REJECTION! Shutting down...', { reason });
  server.close(() => process.exit(1));
});

// ============================================================
// START SERVER
// ============================================================
let server;

const startServer = async () => {
  await connectDB();

  server = app.listen(PORT, () => {
    logger.info(`🏨 Hotel Management API running on port ${PORT} [${process.env.NODE_ENV}]`);
    logger.info(`📡 API: http://localhost:${PORT}/api/${process.env.API_VERSION || 'v1'}`);
    logger.info(`🩺 Health: http://localhost:${PORT}/health`);
  });

  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;
};

// ============================================================
// GRACEFUL SHUTDOWN
// ============================================================
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Shutting down gracefully...`);

  server.close(async () => {
    logger.info('HTTP server closed.');
    await disconnectDB();
    logger.info('Database connection closed.');
    process.exit(0);
  });

  // Force shutdown after 30s
  setTimeout(() => {
    logger.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();