const { db } = require('../config/firebase');

/**
 * Log audit event to Firestore
 * Used for compliance, security monitoring, and debugging
 */
const auditLog = async (logData) => {
  try {
    const { userId, action, details, ipAddress, userAgent } = logData;

    await db.collection('auditLogs').add({
      userId,
      action,
      details,
      ipAddress,
      userAgent,
      timestamp: new Date(),
      status: 'success'
    });

    console.log(`[AUDIT] ${action} by user ${userId}`);
  } catch (error) {
    console.error('[AUDIT ERROR]', error);
    // Don't throw - audit logging shouldn't break the main flow
  }
};

module.exports = { auditLog };
