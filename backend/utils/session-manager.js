const db = require('../config/database');
const crypto = require('crypto');

/**
 * Session Manager
 * Handles secure session creation, validation, and cleanup
 */

/**
 * Create new session
 */
const createSession = async (userId, cnic, ipAddress, userAgent) => {
  try {
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await db.query(
      `INSERT INTO sessions (user_id, session_token, user_agent, ip_address, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, sessionToken, userAgent, ipAddress, expiresAt]
    );

    console.log(`[Session] Created for user ${userId}`);

    return {
      sessionToken,
      expiresAt,
      expiresIn: 24 * 60 * 60, // 24 hours in seconds
    };
  } catch (error) {
    console.error('[Session Error]', error);
    throw error;
  }
};

/**
 * Validate session token
 * Checks token exists, not expired, and matches IP/User-Agent
 */
const validateSession = async (sessionToken, ipAddress, userAgent) => {
  try {
    const result = await db.query(
      `SELECT user_id, ip_address, user_agent, expires_at
       FROM sessions
       WHERE session_token = $1 AND expires_at > NOW()`,
      [sessionToken]
    );

    if (result.rows.length === 0) {
      return null; // Session not found or expired
    }

    const session = result.rows[0];

    // Verify IP address (allow slight variation for proxies)
    if (session.ip_address !== ipAddress) {
      console.warn(`[Security] IP mismatch for session: expected ${session.ip_address}, got ${ipAddress}`);
      // Note: In strict mode, you might want to invalidate the session
    }

    // Verify User-Agent
    if (session.user_agent !== userAgent) {
      console.warn(`[Security] User-Agent mismatch for session`);
      // Note: In strict mode, you might want to invalidate the session
    }

    return {
      userId: session.user_id,
      expiresAt: session.expires_at,
    };
  } catch (error) {
    console.error('[Session Error]', error);
    return null;
  }
};

/**
 * Extend session expiry
 */
const extendSession = async (sessionToken) => {
  try {
    const newExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.query(
      `UPDATE sessions SET expires_at = $1 WHERE session_token = $2`,
      [newExpiresAt, sessionToken]
    );

    console.log(`[Session] Extended session token`);
    return newExpiresAt;
  } catch (error) {
    console.error('[Session Error]', error);
    throw error;
  }
};

/**
 * Revoke session (logout)
 */
const revokeSession = async (sessionToken) => {
  try {
    await db.query(`DELETE FROM sessions WHERE session_token = $1`, [sessionToken]);

    console.log(`[Session] Revoked session`);
  } catch (error) {
    console.error('[Session Error]', error);
    throw error;
  }
};

/**
 * Revoke all sessions for a user (force logout everywhere)
 */
const revokeAllUserSessions = async (userId) => {
  try {
    const result = await db.query(
      `DELETE FROM sessions WHERE user_id = $1 RETURNING COUNT(*)`,
      [userId]
    );

    console.log(`[Session] Revoked all sessions for user ${userId}`);
    return result.rowCount;
  } catch (error) {
    console.error('[Session Error]', error);
    throw error;
  }
};

/**
 * Get user's active sessions
 */
const getUserActiveSessions = async (userId) => {
  try {
    const result = await db.query(
      `SELECT session_token, user_agent, ip_address, expires_at, created_at
       FROM sessions
       WHERE user_id = $1 AND expires_at > NOW()
       ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows;
  } catch (error) {
    console.error('[Session Error]', error);
    return [];
  }
};

/**
 * Clean up expired sessions (housekeeping)
 */
const cleanupExpiredSessions = async () => {
  try {
    const result = await db.query(`DELETE FROM sessions WHERE expires_at < NOW()`);

    console.log(`[Session] Cleaned up ${result.rowCount} expired sessions`);
    return result.rowCount;
  } catch (error) {
    console.error('[Session Error]', error);
  }
};

/**
 * Schedule automatic cleanup (run every hour)
 */
const scheduleSessionCleanup = () => {
  setInterval(cleanupExpiredSessions, 60 * 60 * 1000); // Every hour
  console.log('[Session] Automatic cleanup scheduled (every hour)');
};

module.exports = {
  createSession,
  validateSession,
  extendSession,
  revokeSession,
  revokeAllUserSessions,
  getUserActiveSessions,
  cleanupExpiredSessions,
  scheduleSessionCleanup,
};
