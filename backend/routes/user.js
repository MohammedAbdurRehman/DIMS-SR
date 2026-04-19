const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const {
  validateChangeEmail,
  validateChangePassword,
  validateResetMfa,
  handleValidationErrors,
  sanitizeInput,
} = require('../middleware/validation');
const { verifyJWT } = require('../middleware/auth');
const { db, auth } = require('../config/firebase');
const { auditLog } = require('../utils/audit-logger');

/**
 * For accounts with MFA enabled, require a valid TOTP on the same request (UI prompts, then retries with mfaCode).
 * JWTs from firebase-auth do not carry mfaVerified; the old requireMFA middleware therefore always blocked these routes.
 */
function ensureMfaForSensitiveAction(user, mfaCode, res) {
  if (!user.mfaEnabled) return true;
  if (!user.mfaSecret) {
    res.status(500).json({ error: 'MFA is enabled but no secret is stored for this account.' });
    return false;
  }
  const code = mfaCode != null ? String(mfaCode).trim() : '';
  if (!/^\d{6}$/.test(code)) {
    res.status(403).json({
      mfaRequired: true,
      error: 'MFA verification required to complete this change.',
    });
    return false;
  }
  const verified = speakeasy.totp.verify({
    secret: user.mfaSecret,
    encoding: 'base32',
    token: code,
    window: 2,
  });
  if (!verified) {
    res.status(401).json({ error: 'Invalid MFA code' });
    return false;
  }
  return true;
}

function timelineEntryToJson(entry) {
  if (!entry) return null;
  const ts = entry.timestamp;
  const timestamp =
    ts && typeof ts.toDate === 'function'
      ? ts.toDate().toISOString()
      : typeof ts === 'string'
        ? ts
        : ts instanceof Date
          ? ts.toISOString()
          : null;
  return {
    status: entry.status,
    description: entry.description,
    timestamp,
  };
}

function normalizeShipmentStatus(raw) {
  const key = String(raw || 'processing').toLowerCase().replace(/\s+/g, '-');
  const map = {
    confirmed: 'Processing',
    processing: 'Processing',
    shipped: 'Shipped',
    'in-transit': 'In Transit',
    intransit: 'In Transit',
    delivered: 'Delivered',
  };
  return map[key] || 'Processing';
}

/**
 * GET /api/user/profile
 * Get current user profile and registered SIMs
 */
router.get('/profile', verifyJWT, async (req, res) => {
  try {
    const uid = req.user.uid;

    // Get user document
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();

    // Get user's SIMs
    const simsSnapshot = await db.collection('sims').where('uid', '==', uid).get();
    const sims = simsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      registrationDate: doc.data().registrationDate?.toDate?.()?.toISOString() || doc.data().registrationDate,
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
    }));

    // Get user's orders
    const ordersSnapshot = await db.collection('orders').where('uid', '==', uid).get();
    const orders = ordersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      orderDate: doc.data().orderDate?.toDate?.()?.toISOString() || doc.data().orderDate,
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
    }));

    res.json({
      message: 'Profile retrieved successfully',
      user: {
        uid,
        cnic: userData.cnic,
        name: userData.name,
        fatherName: userData.fatherName,
        email: userData.email,
        mfaEnabled: userData.mfaEnabled,
        accountStatus: userData.accountStatus,
        createdAt: userData.createdAt?.toDate?.()?.toISOString() || userData.createdAt,
        registeredSims: userData.registeredSims || [],
      },
      sims,
      orders,
    });
  } catch (error) {
    console.error('[Error] Fetching Profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

/**
 * GET /api/user/track-order/:trackingNumber
 * Track order by tracking number (public endpoint)
 */
router.get('/track-order/:trackingNumber', async (req, res) => {
  try {
    const trackingNumber = decodeURIComponent(req.params.trackingNumber || '').trim();
    if (!trackingNumber) {
      return res.status(400).json({ error: 'Tracking number is required' });
    }

    const ordersSnapshot = await db.collection('orders').where('trackingNumber', '==', trackingNumber).limit(1).get();

    if (ordersSnapshot.empty) {
      return res.status(404).json({ error: 'Order not found', message: 'No order matches this tracking number.' });
    }

    const orderDoc = ordersSnapshot.docs[0];
    const orderData = orderDoc.data();

    const simDoc = await db.collection('sims').doc(orderData.simId).get();
    const simData = simDoc.exists ? simDoc.data() : null;

    const rawTimeline = Array.isArray(orderData.timeline) ? orderData.timeline : [];
    const timelineJson = rawTimeline.map(timelineEntryToJson).filter(Boolean);
    const lastRaw = rawTimeline.length
      ? rawTimeline[rawTimeline.length - 1]?.status
      : orderData.status;

    res.json({
      message: 'Order found',
      order: {
        id: orderDoc.id,
        trackingNumber: orderData.trackingNumber,
        transactionId: orderData.transactionId,
        fabricTxId: orderData.fabricTxId || null,
        network: simData?.networkProvider || 'Unknown',
        mobileNumber: simData?.mobileNumber || 'Unknown',
        status: normalizeShipmentStatus(lastRaw),
        date: orderData.orderDate?.toDate?.()?.toISOString() || orderData.orderDate,
        timeline: timelineJson,
        deliveryAddress: orderData.deliveryAddress,
      },
    });
  } catch (error) {
    console.error('[Error] Tracking Order:', error);
    res.status(500).json({ error: 'Failed to track order' });
  }
});

/**
 * POST /api/user/change-email
 * Change user email address
 */
router.post(
  '/change-email',
  verifyJWT,
  sanitizeInput,
  validateChangeEmail,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { newEmail, password, mfaCode } = req.body;
      const userId = req.user.uid;

      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        return res.status(404).json({ error: 'User not found' });
      }
      const user = userDoc.data();

      const passwordMatch = await bcrypt.compare(password, user.passwordHash);
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Invalid password' });
      }

      if (!ensureMfaForSensitiveAction(user, mfaCode, res)) return;

      const normalizedEmail = newEmail.toLowerCase();
      const dupSnap = await db.collection('users').where('email', '==', normalizedEmail).limit(2).get();
      const taken = dupSnap.docs.some((d) => d.id !== userId);
      if (taken) {
        return res.status(409).json({ error: 'Email already in use' });
      }

      try {
        await auth.updateUser(userId, { email: normalizedEmail });
      } catch (authErr) {
        if (authErr.code === 'auth/email-already-exists') {
          return res.status(409).json({ error: 'This email is already in use by another account' });
        }
        throw authErr;
      }

      await db.collection('users').doc(userId).update({
        email: normalizedEmail,
        updatedAt: new Date(),
      });

      await auditLog({
        userId,
        action: 'EMAIL_CHANGED',
        details: { newEmail: normalizedEmail, timestamp: new Date().toISOString() },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({
        message: 'Email changed successfully',
        newEmail: normalizedEmail,
      });
    } catch (error) {
      console.error('[Error] Changing Email:', error);
      res.status(500).json({ error: 'Failed to change email' });
    }
  }
);

/**
 * POST /api/user/change-password
 * Change user password
 */
router.post(
  '/change-password',
  verifyJWT,
  sanitizeInput,
  validateChangePassword,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { currentPassword, newPassword, mfaCode } = req.body;
      const userId = req.user.uid;

      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        return res.status(404).json({ error: 'User not found' });
      }
      const user = userDoc.data();

      const passwordMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      if (!ensureMfaForSensitiveAction(user, mfaCode, res)) return;

      const newPasswordHash = await bcrypt.hash(newPassword, 12);

      await auth.updateUser(userId, {
        password: newPassword,
      });

      await db.collection('users').doc(userId).update({
        passwordHash: newPasswordHash,
        updatedAt: new Date(),
      });

      await auditLog({
        userId: userId,
        action: 'PASSWORD_CHANGED',
        details: {
          timestamp: new Date().toISOString(),
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({
        message: 'Password changed successfully',
        note: 'All active sessions have been invalidated. Please log in again.',
      });
    } catch (error) {
      console.error('[Error] Changing Password:', error);
      res.status(500).json({ error: 'Failed to change password' });
    }
  }
);

/**
 * POST /api/user/reset-mfa
 * Clear MFA enrollment and issue a new secret (user completes setup via /api/auth/mfa/setup + verify).
 */
router.post(
  '/reset-mfa',
  verifyJWT,
  sanitizeInput,
  validateResetMfa,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { password, mfaCode } = req.body;
      const userId = req.user.uid;

      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        return res.status(404).json({ error: 'User not found' });
      }
      const user = userDoc.data();

      const passwordMatch = await bcrypt.compare(password, user.passwordHash);
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Invalid password' });
      }

      if (!ensureMfaForSensitiveAction(user, mfaCode, res)) return;

      const mfaSecret = speakeasy.generateSecret({
        name: `DIMS-SR (${user.email || 'user'})`,
        issuer: 'DIMS-SR',
        length: 32,
      });

      await db.collection('users').doc(userId).update({
        mfaSecret: mfaSecret.base32,
        mfaEnabled: false,
        mfaVerified: false,
        mfaRequired: true,
        updatedAt: new Date(),
      });

      await auditLog({
        userId,
        action: 'MFA_RESET_REQUESTED',
        details: { timestamp: new Date().toISOString() },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({
        message: 'MFA has been reset. Scan the new QR code to re-enable MFA.',
        mfaReset: true,
      });
    } catch (error) {
      console.error('[Error] Resetting MFA:', error);
      res.status(500).json({ error: 'Failed to reset MFA' });
    }
  }
);

/**
 * POST /api/user/setup-mfa
 * Generate QR code for MFA setup
 */
router.post('/setup-mfa', verifyJWT, async (req, res) => {
  try {
    const userId = req.user.uid;
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = userDoc.data();
    const email = user.email || 'user@dims-sr.local';

    const secret = speakeasy.generateSecret({
      name: `DIMS-SR (${email})`,
      issuer: 'DIMS-SR',
      length: 32,
    });

    await db.collection('users').doc(userId).update({
      mfaSecret: secret.base32,
      mfaEnabled: false,
      mfaVerified: false,
      updatedAt: new Date(),
    });

    res.json({
      message: 'MFA setup initiated',
      secret: secret.base32,
      otpauthUrl: secret.otpauth_url,
      qrCodeUrl:
        'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(secret.otpauth_url),
      instructions: [
        '1. Open your authenticator app (Google Authenticator, Microsoft Authenticator, Authy, etc.)',
        '2. Scan the QR code or enter the secret key manually',
        '3. Confirm by submitting the 6-digit code via POST /api/user/confirm-mfa',
      ],
    });
  } catch (error) {
    console.error('[Error] MFA Setup:', error);
    res.status(500).json({ error: 'Failed to setup MFA' });
  }
});

/**
 * POST /api/user/confirm-mfa
 * Confirm MFA setup with verification code
 */
router.post('/confirm-mfa', verifyJWT, async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user.uid;

    if (!code || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: 'Invalid verification code format' });
    }

    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = userDoc.data();
    if (!user.mfaSecret) {
      return res.status(400).json({ error: 'MFA setup not initiated' });
    }

    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token: code,
      window: 2,
    });

    if (!verified) {
      return res.status(401).json({ error: 'Invalid verification code' });
    }

    await db.collection('users').doc(userId).update({
      mfaEnabled: true,
      mfaVerified: true,
      mfaRequired: false,
      accountStatus: user.accountStatus === 'pending_mfa' ? 'active' : user.accountStatus || 'active',
      mfaActivatedAt: new Date(),
      updatedAt: new Date(),
    });

    await auditLog({
      userId,
      action: 'MFA_ENABLED_USER_ROUTE',
      details: { timestamp: new Date().toISOString() },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({
      message: 'MFA enabled successfully',
      mfaEnabled: true,
    });
  } catch (error) {
    console.error('[Error] Confirming MFA:', error);
    res.status(500).json({ error: 'Failed to confirm MFA' });
  }
});

/**
 * POST /api/user/disable-mfa
 * Disable MFA
 */
router.post(
  '/disable-mfa',
  verifyJWT,
  sanitizeInput,
  validateResetMfa,
  handleValidationErrors,
  async (req, res) => {
  try {
    const { password, mfaCode } = req.body;
    const userId = req.user.uid;

    if (!password) {
      return res.status(400).json({ error: 'Password is required to disable MFA' });
    }

    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = userDoc.data();

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    if (!ensureMfaForSensitiveAction(user, mfaCode, res)) return;

    await db.collection('users').doc(userId).update({
      mfaEnabled: false,
      mfaVerified: false,
      mfaRequired: false,
      updatedAt: new Date(),
    });

    await auditLog({
      userId,
      action: 'MFA_DISABLED',
      details: { timestamp: new Date().toISOString() },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({
      message: 'MFA disabled successfully',
      mfaEnabled: false,
    });
  } catch (error) {
    console.error('[Error] Disabling MFA:', error);
    res.status(500).json({ error: 'Failed to disable MFA' });
  }
});

module.exports = router;
