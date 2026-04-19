const express = require('express');
const router = express.Router();
const { db, auth } = require('../config/firebase');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const {
  validateSignup,
  validateLogin,
  validateForgotPasswordRequest,
  validatePasswordResetConfirm,
  sanitizeInput,
  handleValidationErrors,
} = require('../middleware/validation');
const { auditLog } = require('../utils/audit-logger');
const { verifyJWT } = require('../middleware/auth');
const { verifyUserWithNadra } = require('../utils/nadra-service');

function formatCnicInput(cnic) {
  const normalizedCNIC = String(cnic).replace(/\D/g, '');
  if (normalizedCNIC.length !== 13) return null;
  return `${normalizedCNIC.slice(0, 5)}-${normalizedCNIC.slice(5, 12)}-${normalizedCNIC.slice(12)}`;
}

// Helper function to generate JWT tokens
const generateTokens = (uid) => {
  const accessToken = jwt.sign(
    { uid, type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRY || '10m' } // Changed from 15m to 10m
  );

  const refreshToken = jwt.sign(
    { uid, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '7d' }
  );

  return { accessToken, refreshToken };
};

// SIGNUP endpoint
router.post('/signup', validateSignup, async (req, res) => {
  try {
    const { email, password, name, fatherName, cnic, cnicIssueDate, dateOfBirth } = req.body;

    // Validate CNIC format (Pakistani CNIC: XXXXX-XXXXXXX-X or 13 digits)
    const cnicRegex = /^(\d{5}-\d{7}-\d{1}|\d{13})$/;
    if (!cnicRegex.test(cnic)) {
      return res.status(400).json({ error: 'Invalid CNIC format. Use XXXXX-XXXXXXX-X or 13 digits' });
    }

    // Normalize CNIC to standard format (XXXXX-XXXXXXX-X)
    const normalizedCNIC = cnic.replace(/\D/g, '');
    const formattedCNIC = `${normalizedCNIC.slice(0, 5)}-${normalizedCNIC.slice(5, 12)}-${normalizedCNIC.slice(12)}`;

    // 🔴 CHECK 1: Verify CNIC doesn't already exist (prevents duplicate CNICs)
    const existingCNICQuery = await db.collection('users')
      .where('cnic', '==', formattedCNIC)
      .limit(1)
      .get();

    if (!existingCNICQuery.empty) {
      return res.status(400).json({ 
        error: 'Duplicate CNIC', 
        message: 'A user account with this CNIC already exists. Please login if you have an existing account.' 
      });
    }

    // 🔴 CHECK 2: Verify email doesn't already exist
    const existingEmailQuery = await db.collection('users')
      .where('email', '==', email.toLowerCase())
      .limit(1)
      .get();

    if (!existingEmailQuery.empty) {
      return res.status(400).json({ 
        error: 'Duplicate email', 
        message: 'An account with this email already exists.' 
      });
    }

    // Verify user against NADRA database (required)
    const nadraResult = await verifyUserWithNadra(formattedCNIC, name, fatherName, dateOfBirth);
    if (!nadraResult.verified) {
      return res.status(403).json({
        error: 'Identity verification failed',
        message: 'Your details do not match NADRA records. Please ensure your information is accurate.',
        source: 'nadra-real'
      });
    }

    // Create Firebase Auth user
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
      emailVerified: false
    });

    // Hash password for additional security layer
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate MFA secret for future setup
    const mfaSecret = speakeasy.generateSecret({
      name: `DIMS-SR (${email})`,
      issuer: 'DIMS-SR',
      length: 32
    });

    // Generate backup codes for account recovery
    const backupCodes = Array.from({ length: 10 }, () => 
      Math.random().toString(36).substring(2, 10).toUpperCase()
    );

    // Store user data in Firestore
    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: email.toLowerCase(),
      name,
      fatherName,
      cnic: formattedCNIC,
      cnicIssueDate,
      dateOfBirth: dateOfBirth || null,
      nadraVerified: true,
      passwordHash: hashedPassword,
      mfaEnabled: false,
      mfaSecret: mfaSecret.base32,
      mfaVerified: false,
      mfaRequired: true,
      accountStatus: 'pending_mfa',
      backupCodes,
      loginAttempts: 0,
      lastLoginAttempt: null,
      registeredSims: [],
      deactivatedSims: [],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Log this event to blockchain via Fabric
    await auditLog({
      userId: userRecord.uid,
      action: 'USER_SIGNUP',
      details: {
        email,
        cnic,
        timestamp: new Date().toISOString()
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(userRecord.uid);

    // Store refresh token in Firestore
    await db.collection('sessions').add({
      uid: userRecord.uid,
      refreshToken,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(201).json({
      success: true,
      message: 'Account created successfully. Please complete MFA setup.',
      accessToken,
      refreshToken,
      user: {
        uid: userRecord.uid,
        email,
        name,
        mfaRequired: true,
        accountStatus: 'pending_mfa'
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ 
      error: 'Failed to create account',
      message: error.message 
    });
  }
});

// LOGIN endpoint
router.post('/login', validateLogin, async (req, res) => {
  try {
    const { cnic, password } = req.body;

    // Normalize CNIC
    const normalizedCNIC = cnic.replace(/\D/g, '');
    const formattedCNIC = `${normalizedCNIC.slice(0, 5)}-${normalizedCNIC.slice(5, 12)}-${normalizedCNIC.slice(12)}`;

    // Get user from Firestore by CNIC (check both formats for backward compatibility)
    let userSnapshot = await db.collection('users')
      .where('cnic', '==', formattedCNIC)
      .limit(1)
      .get();
    
    // If not found with dashes, try without dashes
    if (userSnapshot.empty) {
      userSnapshot = await db.collection('users')
        .where('cnic', '==', normalizedCNIC)
        .limit(1)
        .get();
    }
    
    if (userSnapshot.empty) {
      return res.status(401).json({ error: 'Invalid CNIC or password' });
    }

    const userDoc = userSnapshot.docs[0];
    const user = userDoc.data();

    // 🔴 CHECK: Account status must be 'active' (completed MFA)
    if (user.accountStatus !== 'active') {
      if (user.accountStatus === 'pending_mfa') {
        return res.status(403).json({ 
          error: 'Account setup incomplete', 
          message: 'Please complete MFA setup before logging in.',
          accountStatus: 'pending_mfa'
        });
      }
      
      return res.status(403).json({ 
        error: 'Account inactive', 
        message: 'Your account has been deactivated. Please contact support.',
        accountStatus: user.accountStatus
      });
    }

    // Check login attempts
    const now = new Date();
    if (user.lastLoginAttempt) {
      const timeDiff = (now - user.lastLoginAttempt.toDate()) / (1000 * 60);
      if (user.loginAttempts >= 5 && timeDiff < 15) {
        return res.status(429).json({ 
          error: 'Too many login attempts. Try again after 15 minutes' 
        });
      }
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      // Increment login attempts
      await db.collection('users').doc(userDoc.id).update({
        loginAttempts: user.loginAttempts + 1,
        lastLoginAttempt: new Date()
      });

      return res.status(401).json({ error: 'Invalid CNIC or password' });
    }

    // NADRA re-verification at login (only if not already verified recently)
    try {
      const nadraResult = await verifyUserWithNadra(user.cnic, user.name, user.fatherName, user.dateOfBirth);
      if (!nadraResult.verified) {
        // Allow login if user was previously verified (for testing/backward compatibility)
        if (!user.nadraVerified) {
          await auditLog({
            userId: userDoc.id,
            action: 'LOGIN_NADRA_VERIFICATION_FAILED',
            details: { cnic: user.cnic, timestamp: new Date().toISOString() },
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
          });
          return res.status(403).json({
            error: 'Identity verification failed',
            message: 'Your identity could not be verified with NADRA records.'
          });
        }
        // Log but allow login for previously verified users
        console.warn(`NADRA re-verification failed for previously verified user: ${user.cnic}`);
      }
    } catch (nadraError) {
      console.error('NADRA check during login failed:', nadraError);
      // Allow login if NADRA service is down but user is already nadraVerified
      if (!user.nadraVerified) {
        return res.status(503).json({
          error: 'Identity verification service unavailable. Please try again later.'
        });
      }
    }

    // Reset login attempts on successful login
    await db.collection('users').doc(userDoc.id).update({
      loginAttempts: 0,
      lastLoginAttempt: null
    });

    // If MFA is enabled, require MFA verification
    if (user.mfaEnabled && user.mfaVerified) {
      return res.status(200).json({
        success: true,
        mfaRequired: true,
        tempToken: jwt.sign(
          { uid: userDoc.id, temp: true },
          process.env.JWT_SECRET,
          { expiresIn: '10m' }
        ),
        user: {
          uid: userDoc.id,
          email: user.email,
          name: user.name
        }
      });
    }

    // Generate tokens for successful login

    const { accessToken, refreshToken } = generateTokens(userDoc.id);

    // Store session
    await db.collection('sessions').add({
      uid: userDoc.id,
      refreshToken,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    // Log login
    await auditLog({
      userId: userDoc.id,
      action: 'USER_LOGIN',
      details: { email: user.email, timestamp: new Date().toISOString() },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({
      success: true,
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: {
        uid: userDoc.id,
        email: user.email,
        name: user.name,
        accountStatus: 'active'
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// SETUP MFA endpoint
router.post('/mfa/setup', verifyJWT, async (req, res) => {
  try {
    const { uid } = req.user;
    const userDoc = await db.collection('users').doc(uid).get();
    const user = userDoc.data();

    // Generate QR code
    const otpauthUrl = speakeasy.otpauthURL({
      secret: user.mfaSecret,
      encoding: 'base32',
      label: `DIMS-SR (${user.email})`,
      issuer: 'DIMS-SR'
    });

    const qrCode = await QRCode.toDataURL(otpauthUrl);

    res.json({
      success: true,
      qrCode,
      manualEntry: user.mfaSecret,
      message: 'Scan QR code with your authenticator app'
    });

  } catch (error) {
    console.error('MFA setup error:', error);
    res.status(500).json({ error: 'MFA setup failed' });
  }
});

// VERIFY MFA CODE endpoint - 🔴 UPDATED TO SET ACCOUNT TO ACTIVE
router.post('/mfa/verify', verifyJWT, async (req, res) => {
  try {
    const { uid } = req.user;
    const { code } = req.body;

    if (!code || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: 'Invalid code format' });
    }

    const userDoc = await db.collection('users').doc(uid).get();
    const user = userDoc.data();

    // Verify TOTP code
    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token: code,
      window: 2
    });

    if (!verified) {
      return res.status(401).json({ error: 'Invalid MFA code' });
    }

    // 🔴 UPDATE: Mark MFA as verified, enabled, AND set account status to ACTIVE
    await db.collection('users').doc(uid).update({
      mfaEnabled: true,
      mfaVerified: true,
      mfaRequired: false,
      accountStatus: 'active',
      mfaActivatedAt: new Date(),
      updatedAt: new Date()
    });

    // Log MFA setup completion
    await auditLog({
      userId: uid,
      action: 'MFA_SETUP_COMPLETE',
      details: { 
        email: user.email,
        accountStatus: 'active',
        timestamp: new Date().toISOString() 
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({
      success: true,
      message: 'MFA enabled successfully. Your account is now active!',
      accountStatus: 'active',
      mfaRequired: false
    });

  } catch (error) {
    console.error('MFA verification error:', error);
    res.status(500).json({ error: 'MFA verification failed' });
  }
});

// VERIFY MFA CODE ON LOGIN endpoint
router.post('/mfa/verify-login', async (req, res) => {
  try {
    const { tempToken, code } = req.body;

    if (!code || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: 'Invalid code format' });
    }

    // Verify temp token
    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
      if (!decoded.temp) throw new Error('Not a temp token');
    } catch (error) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const userDoc = await db.collection('users').doc(decoded.uid).get();
    const user = userDoc.data();

    // Verify TOTP code
    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token: code,
      window: 2
    });

    if (!verified) {
      return res.status(401).json({ error: 'Invalid MFA code' });
    }

    // Generate full tokens
    const { accessToken, refreshToken } = generateTokens(decoded.uid);

    // Store session
    await db.collection('sessions').add({
      uid: decoded.uid,
      refreshToken,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    // Log successful MFA login
    await auditLog({
      userId: decoded.uid,
      action: 'MFA_LOGIN_SUCCESS',
      details: { email: user.email, timestamp: new Date().toISOString() },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({
      success: true,
      accessToken,
      refreshToken,
      user: {
        uid: decoded.uid,
        email: user.email,
        name: user.name
      }
    });

  } catch (error) {
    console.error('MFA login error:', error);
    res.status(500).json({ error: 'MFA verification failed' });
  }
});

// REFRESH TOKEN endpoint
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Check if session exists in Firestore
    const sessionSnapshot = await db.collection('sessions')
      .where('uid', '==', decoded.uid)
      .where('refreshToken', '==', refreshToken)
      .limit(1)
      .get();

    if (sessionSnapshot.empty) {
      return res.status(401).json({ error: 'Session not found' });
    }

    // Generate new access token
    const accessToken = jwt.sign(
      { uid: decoded.uid, type: 'access' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '10m' } // Changed from 15m to 10m
    );

    res.json({ success: true, accessToken });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

// LOGOUT endpoint
router.post('/logout', verifyJWT, async (req, res) => {
  try {
    const { uid } = req.user;
    const { refreshToken } = req.body;

    if (refreshToken) {
      // Delete session from Firestore
      const sessionSnapshot = await db.collection('sessions')
        .where('uid', '==', uid)
        .where('refreshToken', '==', refreshToken)
        .limit(1)
        .get();

      if (!sessionSnapshot.empty) {
        await db.collection('sessions').doc(sessionSnapshot.docs[0].id).delete();
      }
    }

    // Log logout
    await auditLog({
      userId: uid,
      action: 'USER_LOGOUT',
      details: { timestamp: new Date().toISOString() },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({ success: true, message: 'Logged out successfully' });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

/**
 * POST /api/auth/forgot-password
 * Verifies CNIC + registered email match, then returns a short-lived reset token (no email provider required).
 */
router.post(
  '/forgot-password',
  sanitizeInput,
  validateForgotPasswordRequest,
  handleValidationErrors,
  async (req, res) => {
    try {
      const formattedCNIC = formatCnicInput(req.body.cnic);
      if (!formattedCNIC) {
        return res.status(400).json({ error: 'Invalid CNIC' });
      }
      const email = String(req.body.email).trim().toLowerCase();

      let userSnapshot = await db.collection('users').where('cnic', '==', formattedCNIC).limit(1).get();
      if (userSnapshot.empty) {
        userSnapshot = await db
          .collection('users')
          .where('cnic', '==', String(req.body.cnic).replace(/\D/g, ''))
          .limit(1)
          .get();
      }

      if (userSnapshot.empty) {
        return res.status(404).json({
          error: 'No account found',
          message: 'No user matches this CNIC and email. Check your details or register.',
        });
      }

      const userDoc = userSnapshot.docs[0];
      const user = userDoc.data();
      if (String(user.email || '').toLowerCase() !== email) {
        return res.status(401).json({
          error: 'Verification failed',
          message: 'The email address does not match the account for this CNIC.',
        });
      }

      const resetToken = jwt.sign(
        { uid: userDoc.id, purpose: 'password_reset' },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
      );

      await auditLog({
        userId: userDoc.id,
        action: 'PASSWORD_RESET_REQUESTED',
        details: { timestamp: new Date().toISOString() },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({
        success: true,
        message: 'You can now set a new password. This link expires in 15 minutes.',
        resetToken,
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ error: 'Unable to process request' });
    }
  }
);

/**
 * POST /api/auth/reset-password
 * Completes password reset using token from /forgot-password
 */
router.post(
  '/reset-password',
  sanitizeInput,
  validatePasswordResetConfirm,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { resetToken, newPassword } = req.body;
      let decoded;
      try {
        decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
      } catch {
        return res.status(401).json({ error: 'Invalid or expired reset token' });
      }
      if (decoded.purpose !== 'password_reset' || !decoded.uid) {
        return res.status(401).json({ error: 'Invalid reset token' });
      }

      const uid = decoded.uid;
      const userDoc = await db.collection('users').doc(uid).get();
      if (!userDoc.exists) {
        return res.status(404).json({ error: 'User not found' });
      }

      const newPasswordHash = await bcrypt.hash(newPassword, 12);
      await auth.updateUser(uid, { password: newPassword });
      await db.collection('users').doc(uid).update({
        passwordHash: newPasswordHash,
        updatedAt: new Date(),
      });

      const sessionSnap = await db.collection('sessions').where('uid', '==', uid).get();
      const batchDeletes = sessionSnap.docs.map((d) => d.ref.delete());
      await Promise.all(batchDeletes);

      await auditLog({
        userId: uid,
        action: 'PASSWORD_RESET_COMPLETE',
        details: { timestamp: new Date().toISOString() },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({
        success: true,
        message: 'Password updated. Please sign in with your new password.',
      });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ error: 'Failed to reset password' });
    }
  }
);

module.exports = router;
