const mongoose = require('mongoose');
const logger = require('./logger');

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000;

const mongooseOptions = {
  maxPoolSize: 10,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4,
};

let retryCount = 0;

const connectDB = async () => {
  const uri = process.env.NODE_ENV === 'production'
    ? process.env.MONGO_URI_PROD
    : process.env.MONGO_URI;

  try {
    const conn = await mongoose.connect(uri, mongooseOptions);
    retryCount = 0;
    logger.info(`MongoDB connected: ${conn.connection.host} [${process.env.NODE_ENV}]`);

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected — attempting reconnect...');
      scheduleReconnect();
    });

    mongoose.connection.on('error', (err) => {
      logger.error(`MongoDB connection error: ${err.message}`);
    });

  } catch (err) {
    logger.error(`MongoDB connection failed: ${err.message}`);
    scheduleReconnect();
  }
};

const scheduleReconnect = () => {
  if (retryCount < MAX_RETRIES) {
    retryCount++;
    logger.info(`Retrying DB connection (${retryCount}/${MAX_RETRIES}) in ${RETRY_DELAY_MS / 1000}s...`);
    setTimeout(connectDB, RETRY_DELAY_MS);
  } else {
    logger.error('Max DB reconnection attempts reached. Exiting.');
    process.exit(1);
  }
};

const disconnectDB = async () => {
  await mongoose.connection.close();
  logger.info('MongoDB connection closed.');
};

module.exports = { connectDB, disconnectDB };