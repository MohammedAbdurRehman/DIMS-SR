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
const authRoutes = require('../routes/firebase-auth');
const simRoutes = require('../routes/firebase-sim-registration');
const userRoutes = require('../routes/user');
const nadraRoutes = require('../routes/nadra');

// Initialize Express app
const app = express();

// ============= PROXY CONFIGURATION =============
// Trust Vercel's proxy headers for proper IP detection and rate limiting
app.set('trust proxy', 1);

// ============= SECURITY MIDDLEWARE =============

// Helmet - Sets various HTTP headers for security
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for API routes
  crossOriginEmbedderPolicy: false,
}));

// CORS - Control cross-origin requests
app.use(cors({
  origin: true, // Allow all origins for Vercel deployment
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser
app.use(cookieParser());

// Logging
app.use(morgan('combined'));

// ============= ROUTES =============

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/sim', simRoutes);
app.use('/api/user', userRoutes);
app.use('/api/nadra', nadraRoutes);

// CSRF Token endpoint
app.get('/api/csrf-token', (req, res) => {
  res.json({ csrfToken: 'vercel-csrf-token' }); // Simplified for Vercel
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

module.exports = app;