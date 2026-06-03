require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const { globalLimiter } = require('./middlware/rateLimiter');
const errorHandler = require('./middlware/errorHandler');
const { AppError } = require('./utils/appError');
const logger = require('./config/logger');

// Route imports
const authRoutes = require('./routes/auth/authRoute');
const roomRoutes = require('./routes/room/roomRoute');
const guestRoutes = require('./routes/guest/guestRoute');
const bookingRoutes = require('./routes/booking/bookingRoute');

const app = express();

// ============================================================
// SECURITY MIDDLEWARE
// ============================================================

// HTTP security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS
// Normalize configured origins: split, trim whitespace and strip trailing slashes
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:4200')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const normalized = origin.replace(/\/$/, '');
    if (allowedOrigins.includes(normalized)) return callback(null, true);
    callback(new AppError(`CORS: Origin '${origin}' not allowed.`, 403));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.options('*', cors());

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Data sanitization
app.use(mongoSanitize()); // NoSQL injection
app.use(xss());           // XSS attacks
app.use(hpp({             // HTTP Parameter Pollution
  whitelist: ['sort', 'fields', 'type', 'status'],
}));

// Compression
app.use(compression());

// Rate limiting
app.use('/api', globalLimiter);

// HTTP request logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: { write: (msg) => logger.http(msg.trim()) },
    skip: (req) => req.url === '/health',
  }));
}

// ============================================================
// TRUST PROXY (for rate limiting behind nginx/LB)
// ============================================================
app.set('trust proxy', 1);

// ============================================================
// ROUTES
// ============================================================
const API_PREFIX = `/api/${process.env.API_VERSION || 'v1'}`;

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    env: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/rooms`, roomRoutes);
app.use(`${API_PREFIX}/guests`, guestRoutes);
app.use(`${API_PREFIX}/bookings`, bookingRoutes);

// 404 handler
app.all('*', (req, res, next) => {
  next(new AppError(`Cannot find ${req.method} ${req.originalUrl} on this server.`, 404));
});

// Global error handler
app.use(errorHandler);

module.exports = app;