const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

/**
 * JWT Token Verification Middleware
 * Validates JWT token and sets user in request
 */
const verifyJWT = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    res.status(401).json({ error: 'Authentication failed' });
  }
};

/**
 * Session Verification Middleware
 * Validates secure session cookies with rotation
 */
const verifySession = (req, res, next) => {
  try {
    const sessionToken = req.signedCookies?.sessionToken;

    if (!sessionToken) {
      return res.status(401).json({ error: 'Session not found' });
    }

    // In production, verify against database
    const decoded = jwt.verify(sessionToken, process.env.SESSION_SECRET);
    req.session = decoded;
    next();
  } catch (error) {
    res.clearCookie('sessionToken');
    return res.status(401).json({ error: 'Session invalid or expired' });
  }
};

/**
 * MFA Verification Middleware
 * Ensures MFA is verified for sensitive operations
 */
const requireMFA = (req, res, next) => {
  if (!req.user?.mfaVerified) {
    return res.status(403).json({ error: 'MFA verification required' });
  }
  next();
};

/**
 * Rate limiting per user to prevent brute force
 */
const userRateLimit = new Map();

const perUserRateLimit = (maxAttempts = 5, windowMs = 900000) => {
  return (req, res, next) => {
    const identifier = req.user?.id || req.ip;
    const now = Date.now();

    if (!userRateLimit.has(identifier)) {
      userRateLimit.set(identifier, []);
    }

    let attempts = userRateLimit.get(identifier);
    attempts = attempts.filter(time => now - time < windowMs);

    if (attempts.length >= maxAttempts) {
      return res.status(429).json({
        error: 'Too many attempts, please try again later',
      });
    }

    attempts.push(now);
    userRateLimit.set(identifier, attempts);
    next();
  };
};

/**
 * Generate secure JWT token
 */
const generateToken = (userId, cnic, mfaVerified = false) => {
  return jwt.sign(
    {
      id: userId,
      cnic,
      mfaVerified,
      iat: Math.floor(Date.now() / 1000),
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRY || '7d' }
  );
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (userId, cnic) => {
  return jwt.sign(
    {
      id: userId,
      cnic,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000),
    },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '30d' }
  );
};

/**
 * Generate secure session token
 */
const generateSessionToken = (userId, cnic, ipAddress, userAgent) => {
  const sessionData = {
    id: userId,
    cnic,
    sessionId: uuidv4(),
    ipAddress,
    userAgent,
    iat: Math.floor(Date.now() / 1000),
  };

  return jwt.sign(sessionData, process.env.SESSION_SECRET, {
    expiresIn: process.env.SESSION_EXPIRY || '24h',
  });
};

/**
 * Set secure HTTP-only cookie
 * Prevents XSS/CSRF attacks by making cookies inaccessible to JavaScript
 */
const setSecureSessionCookie = (res, sessionToken) => {
  res.cookie('sessionToken', sessionToken, {
    httpOnly: true,
    secure: process.env.SECURE_COOKIES === 'true', // HTTPS only
    sameSite: 'Strict', // CSRF protection
    maxAge: parseInt(process.env.SESSION_EXPIRY || '86400000'), // 24 hours
    signed: true, // Use signature to verify cookie integrity
    path: '/',
  });
};

module.exports = {
  verifyJWT,
  verifySession,
  requireMFA,
  perUserRateLimit,
  generateToken,
  generateRefreshToken,
  generateSessionToken,
  setSecureSessionCookie,
};
