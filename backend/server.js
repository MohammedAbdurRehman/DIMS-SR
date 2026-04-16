require('dotenv').config();

const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Import routes
const authRoutes = require('./routes/firebase-auth');
const simRoutes = require('./routes/firebase-sim-registration');
const userRoutes = require('./routes/user');
const nadraRoutes = require('./routes/nadra');

// Initialize Express app
const app = express();

// ============= SECURITY MIDDLEWARE =============

// Helmet - Sets various HTTP headers for security
app.use(helmet());

// CORS - Control cross-origin requests
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'http://localhost:3000',
      'https://localhost:3000',
      'http://127.0.0.1:3000',
      'https://127.0.0.1:3000',
      'http://10.1.59.49:3000', // Allow network access
    ];

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting - Prevent brute force attacks
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Request logging
app.use(morgan('combined'));

// ============= BODY PARSING =============

// Parse JSON bodies - with size limit to prevent payload attacks
// Increased to 5mb to accommodate fingerprint images (base64 encoded)
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));

// Cookie parser - parse Cookie header
app.use(cookieParser(process.env.SESSION_SECRET));

// ============= CUSTOM SECURITY MIDDLEWARE =============

// Prevent HTTP Parameter Pollution
app.use((req, res, next) => {
  if (req.query && Object.keys(req.query).length > 0) {
    const queryKeys = Object.keys(req.query);
    const uniqueKeys = new Set(queryKeys);
    if (queryKeys.length !== uniqueKeys.size) {
      return res.status(400).json({ error: 'Invalid request: duplicate parameters' });
    }
  }
  next();
});

// CSRF Token generation middleware
const { v4: uuidv4 } = require('uuid');
app.use((req, res, next) => {
  // Simple in-memory CSRF token storage for development
  if (!req.csrfToken) {
    req.csrfToken = uuidv4();
  }
  res.locals.csrfToken = req.csrfToken;
  next();
});

// CSRF Token validation for state-changing operations
app.use((req, res, next) => {
  // Temporarily disable CSRF validation for development
  if (process.env.NODE_ENV === 'production' && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const tokenFromHeader = req.get('X-CSRF-Token');
    const tokenFromBody = req.body?.csrfToken;

    if (!tokenFromHeader && !tokenFromBody) {
      return res.status(403).json({ error: 'CSRF token missing' });
    }

    const token = tokenFromHeader || tokenFromBody;
    if (token !== req.csrfToken) {
      return res.status(403).json({ error: 'Invalid CSRF token' });
    }
  }
  next();
});

// ============= ROUTES =============

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/sim', simRoutes);
app.use('/api/user', userRoutes);
app.use('/api/nadra', nadraRoutes);

// CSRF Token endpoint
app.get('/api/csrf-token', (req, res) => {
  res.json({ csrfToken: res.locals.csrfToken });
});

// ============= ERROR HANDLING =============

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Error]', err);

  // Security: Don't expose internal error details in production
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;

  res.status(err.status || 500).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

// ============= START HTTPS SERVER =============

const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

let server;

if (NODE_ENV === 'production') {
  // HTTPS with SSL/TLS certificates
  const options = {
    key: fs.readFileSync(process.env.SSL_KEY_PATH || './certs/server.key'),
    cert: fs.readFileSync(process.env.SSL_CERT_PATH || './certs/server.crt'),
  };

  server = https.createServer(options, app);
  console.log('[INFO] Starting HTTPS server...');
} else {
  // HTTP for development
  server = require('http').createServer(app);
  console.log('[INFO] Starting HTTP server (development mode)...');
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[✓] Server listening on port ${PORT} (${NODE_ENV} mode)`);
  console.log(`[✓] Accessible at: http://localhost:${PORT} and http://0.0.0.0:${PORT}`);
  console.log(`[✓] Secure cookies: ${process.env.SECURE_COOKIES === 'true'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[INFO] SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('[✓] HTTP server closed');
    process.exit(0);
  });
});

module.exports = app;
