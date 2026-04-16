const https = require('https');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const cookieParser = require('cookie-parser');
const csrf = require('csurf');

const app = express();

// Trust proxy
app.set('trust proxy', 1);

// Security Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'https://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing with size limits
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ limit: '10kb', extended: true }));

// Data sanitization against NoSQL injection
app.use(mongoSanitize());

// Cookie parser
app.use(cookieParser(process.env.SESSION_SECRET));

// CSRF protection
const csrfProtection = csrf({ cookie: false });

// Rate limiting
const globalLimiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000,
  max: process.env.RATE_LIMIT_MAX_REQUESTS || 100,
  message: 'Too many requests from this IP, please try again later.'
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  message: 'Too many login attempts, please try again after 15 minutes.'
});

app.use(globalLimiter);

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// API Routes
app.use('/api/auth', loginLimiter, require('./routes/firebase-auth'));
app.use('/api/sim', require('./routes/firebase-sim-registration'));
app.use('/api/user', require('./routes/user'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[ERROR]', err);

  // Prevent error stack leakage
  if (process.env.NODE_ENV === 'production') {
    return res.status(500).json({ error: 'Internal server error' });
  }

  res.status(err.status || 500).json({
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// HTTPS Setup
const PORT = process.env.PORT || 3001;

const certPath = process.env.SSL_CERT_PATH || path.join(__dirname, '../certs/server.crt');
const keyPath = process.env.SSL_KEY_PATH || path.join(__dirname, '../certs/server.key');

if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  const options = {
    cert: fs.readFileSync(certPath),
    key: fs.readFileSync(keyPath)
  };

  https.createServer(options, app).listen(PORT, () => {
    console.log(`\n✅ DIMS-SR Server running on https://localhost:${PORT}`);
    console.log(`📱 Firebase initialized and ready`);
    console.log(`🔒 HTTPS/TLS enabled\n`);
  });
} else {
  console.error('SSL certificates not found!');
  console.error(`Expected: ${certPath} and ${keyPath}`);
  console.error('Run: bash ./scripts/generate-certs.sh\n');
  process.exit(1);
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});
