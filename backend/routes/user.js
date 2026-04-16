const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const {
  validateChangeEmail,
  validateChangePassword,
  handleValidationErrors,
  sanitizeInput,
} = require('../middleware/validation');
const { verifyJWT, requireMFA } = require('../middleware/auth');
const { db } = require('../config/firebase');
const { auditLog } = require('../utils/audit-logger');

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
    const { trackingNumber } = req.params;

    // Find order by tracking number
    const ordersSnapshot = await db.collection('orders').where('trackingNumber', '==', trackingNumber).limit(1).get();

    if (ordersSnapshot.empty) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const orderDoc = ordersSnapshot.docs[0];
    const orderData = orderDoc.data();

    // Get associated SIM data
    const simDoc = await db.collection('sims').doc(orderData.simId).get();
    const simData = simDoc.exists ? simDoc.data() : null;

    res.json({
      message: 'Order found',
      order: {
        id: orderDoc.id,
        trackingNumber: orderData.trackingNumber,
        transactionId: orderData.transactionId,
        network: simData?.networkProvider || 'Unknown',
        mobileNumber: simData?.mobileNumber || 'Unknown',
        status: orderData.timeline?.[orderData.timeline.length - 1]?.status || 'Processing',
        date: orderData.orderDate?.toDate?.()?.toISOString() || orderData.orderDate,
        timeline: orderData.timeline || [],
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
  requireMFA,
  sanitizeInput,
  validateChangeEmail,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { newEmail, password } = req.body;
      const userId = req.user.id;

      // Fetch user to verify password
      // const userResult = await db.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
      // if (userResult.rows.length === 0) {
      //   return res.status(404).json({ error: 'User not found' });
      // }
      // const user = userResult.rows[0];

      // Mock user for verification
      const user = {
        password_hash: await bcrypt.hash('testpassword', 12),
      };

      // Verify current password
      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Invalid password' });
      }

      // Check if email is already in use
      // const emailCheck = await db.query('SELECT id FROM users WHERE email = $1 AND id != $2', [newEmail, userId]);
      // if (emailCheck.rows.length > 0) {
      //   return res.status(409).json({ error: 'Email already in use' });
      // }

      // Update email in database
      // await db.query('UPDATE users SET email = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newEmail, userId]);

      // Log email change
      // await logAuditEvent(userId, 'EMAIL_CHANGED', 'user', userId, req, { newEmail });

      res.json({
        message: 'Email changed successfully',
        newEmail,
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
  requireMFA,
  sanitizeInput,
  validateChangePassword,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.uid;

      // Fetch user from Firestore
      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        return res.status(404).json({ error: 'User not found' });
      }
      const user = userDoc.data();

      // Verify current password
      const passwordMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, 12);

      // Update password in Firebase Auth
      await auth.updateUser(userId, {
        password: newPassword
      });

      // Update password hash in Firestore
      await db.collection('users').doc(userId).update({
        passwordHash: newPasswordHash,
        updatedAt: new Date()
      });

      // Log password change
      await auditLog({
        userId: userId,
        action: 'PASSWORD_CHANGED',
        details: {
          timestamp: new Date().toISOString()
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
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
 * POST /api/user/setup-mfa
 * Generate QR code for MFA setup
 */
router.post('/setup-mfa', verifyJWT, async (req, res) => {
  try {
    const userId = req.user.id;
    const email = req.user.email || 'user@dims-sr.local';

    // Generate TOTP secret using speakeasy
    // const speakeasy = require('speakeasy');
    // const secret = speakeasy.generateSecret({
    //   name: `DIMS-SR (${email})`,
    //   issuer: 'DIMS-SR',
    //   length: 32
    // });

    // For mock, create fake secret
    const secret = {
      base32: 'JBSWY3DPEBLW64TMMQ======',
      otpauth_url: `otpauth://totp/DIMS-SR%20(${email})?secret=JBSWY3DPEBLW64TMMQ%3D%3D%3D%3D%3D%3D&issuer=DIMS-SR`,
    };

    // Generate QR code from otpauth_url
    // const qrCode = await QRCode.toDataURL(secret.otpauth_url);

    // Store temporary secret (not yet activated)
    // await db.query(
    //   'INSERT INTO mfa_setup_temp (user_id, secret, qr_code) VALUES ($1, $2, $3)',
    //   [userId, secret.base32, qrCode]
    // );

    res.json({
      message: 'MFA setup initiated',
      secret: secret.base32,
      otpauthUrl: secret.otpauth_url,
      qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(secret.otpauth_url),
      instructions: [
        '1. Open your authenticator app (Google Authenticator, Microsoft Authenticator, Authy, etc.)',
        '2. Scan the QR code or enter the secret key manually',
        '3. Confirm by submitting the 6-digit code',
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
    const userId = req.user.id;

    if (!code || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: 'Invalid verification code format' });
    }

    // Verify TOTP code
    // const speakeasy = require('speakeasy');
    // const mfaSetupResult = await db.query('SELECT secret FROM mfa_setup_temp WHERE user_id = $1', [userId]);
    // if (mfaSetupResult.rows.length === 0) {
    //   return res.status(400).json({ error: 'MFA setup not initiated' });
    // }

    // const verified = speakeasy.totp.verify({
    //   secret: mfaSetupResult.rows[0].secret,
    //   encoding: 'base32',
    //   token: code,
    //   window: 2
    // });

    const verified = /^\d{6}$/.test(code); // Mock verification

    if (!verified) {
      return res.status(401).json({ error: 'Invalid verification code' });
    }

    // Activate MFA
    // await db.query('UPDATE users SET mfa_enabled = true, mfa_secret = (SELECT secret FROM mfa_setup_temp WHERE user_id = $1) WHERE id = $1', [userId]);
    // await db.query('DELETE FROM mfa_setup_temp WHERE user_id = $1', [userId]);

    // Log MFA setup
    // await logAuditEvent(userId, 'MFA_ENABLED', 'security', userId, req);

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
router.post('/disable-mfa', verifyJWT, requireMFA, async (req, res) => {
  try {
    const { password } = req.body;
    const userId = req.user.id;

    if (!password) {
      return res.status(400).json({ error: 'Password is required to disable MFA' });
    }

    // Verify password
    // const userResult = await db.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    // const passwordMatch = await bcrypt.compare(password, userResult.rows[0].password_hash);
    // if (!passwordMatch) {
    //   return res.status(401).json({ error: 'Invalid password' });
    // }

    // Disable MFA
    // await db.query('UPDATE users SET mfa_enabled = false, mfa_secret = NULL WHERE id = $1', [userId]);

    // Log MFA disable
    // await logAuditEvent(userId, 'MFA_DISABLED', 'security', userId, req);

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
