const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { db } = require('../config/firebase');
const { verifyJWT } = require('../middleware/auth');
const { validateSIMRegistration } = require('../middleware/validation');
const { auditLog } = require('../utils/audit-logger');
const { submitToBlockchain } = require('../config/fabric-gateway');
const { verifyUserWithNadra, verifyFingerprintWithNadra } = require('../utils/nadra-service');

// REGISTER SIM endpoint
router.post('/register', /* verifyJWT, */ validateSIMRegistration, async (req, res) => {
  try {
    const { uid } = req.user || { uid: 'test-user-123' }; // Test user for development
    const {
      mobileNetwork,
      mobileNumber,
      paymentMethod,
      deliveryAddress,
      paymentAddress,
      sameAsDelivery,
      fingerprintImages: rawFingerprintImages,
      fingerprintImage: legacyFingerprintImage,
    } = req.body;

    const fingerprintImages = Array.isArray(rawFingerprintImages)
      ? rawFingerprintImages
      : legacyFingerprintImage ? [legacyFingerprintImage] : [];

    const fingerprintHashes = fingerprintImages.map(image =>
      crypto.createHash('sha256').update(image).digest('hex')
    );

    // Get user data (mock for testing)
    let user;
    if (req.user) {
      const userDoc = await db.collection('users').doc(uid).get();
      user = userDoc.data();
    } else {
      // Mock user data for testing
      user = {
        cnic: '12345-1234567-1',
        name: 'Test User',
        fatherName: 'Test Father',
        dateOfBirth: '1990-01-01',
        nadraVerified: true,
        registeredSims: [],
        networkProvider: 'jazz'
      };
    }

    // Verify user with NADRA before proceeding (with fallback)
    let nadraUserVerified = false;
    if (!req.user && user.nadraVerified) {
      // Skip NADRA verification for test users
      nadraUserVerified = true;
      console.log('ℹ️  Skipping NADRA verification for test user');
    } else {
      try {
        const nadraVerification = await verifyUserWithNadra(
          user.cnic,
          user.name,
          user.fatherName,
          user.dateOfBirth
        );

        if (!nadraVerification.verified) {
          return res.status(403).json({ 
            error: 'User verification failed. Please ensure your details match NADRA records.',
            source: 'nadra-real'
          });
        }
        nadraUserVerified = true;
      } catch (nadraError) {
        console.warn('⚠️  NADRA user verification service unavailable:', nadraError.message);
        // Allow if user was previously verified
        if (user.nadraVerified) {
          console.log(`ℹ️  Allowing SIM registration (user already verified, NADRA service down)`);
          nadraUserVerified = true;
        } else {
          return res.status(503).json({ 
            error: 'Identity verification service unavailable. Please try again later.',
            source: 'nadra-service-error'
          });
        }
      }
    }

    // Verify fingerprint if provided (with fallback)
    let fingerprintVerified = false;
    if (fingerprintImages.length > 0) {
      if (!req.user) {
        // Skip fingerprint verification for test users
        fingerprintVerified = true;
        console.log('ℹ️  Skipping fingerprint verification for test user');
      } else {
        try {
          const fingerprintVerification = await verifyFingerprintWithNadra(user.cnic, fingerprintImages);

          if (!fingerprintVerification.verified) {
            return res.status(403).json({ 
              error: 'Fingerprint verification failed. Please try again.',
              source: 'nadra-real'
            });
          }
          fingerprintVerified = true;
        } catch (fingerprintError) {
          console.error('NADRA fingerprint verification failed:', fingerprintError.message);
          return res.status(503).json({
            error: 'Identity verification service unavailable',
            message: fingerprintError.message,
            source: 'nadra-service-error',
          });
        }
      }
    } else {
      console.log('ℹ️  No fingerprint images provided');
    }

    // Check if user has 5 active SIMs
    const activeSims = user.registeredSims?.filter(sim => sim.status === 'active') || [];
    if (activeSims.length >= 5) {
      return res.status(403).json({ 
        error: 'Maximum SIM limit reached. Deactivate a SIM to register a new one.' 
      });
    }

    // Validate mobile number format
    if (!/^03\d{9}$/.test(mobileNumber)) {
      return res.status(400).json({ error: 'Invalid mobile number format' });
    }

    // Check if mobile number is already registered
    const existingSimSnapshot = await db.collection('sims')
      .where('mobileNumber', '==', mobileNumber)
      .where('status', '==', 'active')
      .limit(1)
      .get();

    if (!existingSimSnapshot.empty) {
      return res.status(400).json({ error: 'Mobile number already registered' });
    }

    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const trackingNumber = `TRK-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    let fabricTxId = null;

    try {
      const fabricResult = await submitToBlockchain({
        action: 'registerSim',
        cnic: user.cnic,
        mobileNumber,
        networkProvider: mobileNetwork || user.networkProvider,
        transactionId,
        trackingNumber,
        uid,
        timestamp: new Date().toISOString(),
      });
      fabricTxId = fabricResult?.fabricTxId || null;
    } catch (fabricError) {
      console.error('Fabric submit failed (registerSim):', fabricError);
      if (String(process.env.FABRIC_ENABLED || '').toLowerCase() !== 'false') {
        return res.status(503).json({
          error: 'Distributed ledger unavailable',
          message: fabricError.message || 'Could not record registration on Hyperledger Fabric.',
        });
      }
    }

    // Create SIM record in Firestore
    const simData = {
      uid,
      cnic: user.cnic,
      transactionId,
      trackingNumber,
      fabricTxId,
      networkProvider: mobileNetwork || user.networkProvider,
      mobileNumber,
      paymentMethod,
      deliveryAddress,
      paymentAddress: sameAsDelivery ? deliveryAddress : paymentAddress,
      fingerprintHashes,
      fingerprintVerificationStatus: fingerprintVerified ? 'verified' : 'pending',
      status: 'active',
      registrationDate: new Date(),
      activationDate: new Date(),
      deactivationDate: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const simDocRef = await db.collection('sims').add(simData);

    // Create order record
    const orderData = {
      uid,
      transactionId,
      fabricTxId,
      trackingNumber,
      simId: simDocRef.id,
      status: 'confirmed',
      orderDate: new Date(),
      estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      timeline: [
        {
          status: 'confirmed',
          timestamp: new Date(),
          description: 'Order confirmed — further status updates are applied when fulfillment systems update this order.',
        },
      ],
      createdAt: new Date()
    };

    await db.collection('orders').add(orderData);

    // Update user's SIM list
    const updatedSims = [...(user.registeredSims || []), {
      simId: simDocRef.id,
      mobileNumber,
      networkProvider: mobileNetwork || user.networkProvider,
      transactionId,
      fabricTxId,
      trackingNumber,
      fingerprintVerified,
      status: 'active',
      registrationDate: new Date().toISOString()
    }];

    await db.collection('users').doc(uid).set({
      registeredSims: updatedSims,
      updatedAt: new Date()
    }, { merge: true });

    // Audit log
    await auditLog({
      userId: uid,
      action: 'SIM_REGISTRATION',
      details: {
        transactionId,
        trackingNumber,
        mobileNumber,
        networkProvider: mobileNetwork || user.networkProvider,
        timestamp: new Date().toISOString()
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(201).json({
      success: true,
      message: 'SIM registered successfully',
      transaction: {
        transactionId,
        fabricTxId,
        trackingNumber,
        mobileNumber,
        networkProvider: mobileNetwork || user.networkProvider,
        status: 'active',
        registrationDate: new Date()
      }
    });

  } catch (error) {
    console.error('SIM registration error:', error);
    res.status(500).json({ error: 'Failed to register SIM' });
  }
});

// GET REGISTERED SIMS endpoint
router.get('/my-sims', verifyJWT, async (req, res) => {
  try {
    const { uid } = req.user;

    const userDoc = await db.collection('users').doc(uid).get();
    const user = userDoc.data();

    const simsData = user.registeredSims || [];

    res.json({
      success: true,
      sims: simsData,
      summary: {
        total: simsData.length,
        active: simsData.filter(sim => sim.status === 'active').length,
        inactive: simsData.filter(sim => sim.status === 'inactive').length,
        pending: simsData.filter(sim => sim.status === 'processing').length
      }
    });

  } catch (error) {
    console.error('Get SIMs error:', error);
    res.status(500).json({ error: 'Failed to fetch SIMs' });
  }
});

// DEACTIVATE SIM endpoint
router.post('/deactivate', verifyJWT, async (req, res) => {
  try {
    const { uid } = req.user;
    const { simId, fingerprintImages: rawFingerprintImages, fingerprintImage: legacyFingerprintImage } = req.body;
    
    const fingerprintImages = Array.isArray(rawFingerprintImages)
      ? rawFingerprintImages
      : legacyFingerprintImage ? [legacyFingerprintImage] : [];

    if (!simId) {
      return res.status(400).json({ error: 'SIM ID is required' });
    }

    if (fingerprintImages.length === 0) {
      return res.status(400).json({ error: 'Fingerprint verification is required to deactivate SIM' });
    }

    // Get user data
    const userDoc = await db.collection('users').doc(uid).get();
    const user = userDoc.data();

    // Verify fingerprints against NADRA
    try {
      const fingerVerification = await verifyFingerprintWithNadra(user.cnic, fingerprintImages);
      if (!fingerVerification.verified) {
        return res.status(403).json({
          error: 'Fingerprint verification failed. Please try again.',
          source: 'nadra-real'
        });
      }
    } catch (nadraError) {
      console.error('NADRA fingerprint verification failed:', nadraError.message);
      return res.status(503).json({
        error: 'Identity verification service unavailable',
        message: nadraError.message,
        source: 'nadra-service-error',
      });
    }

    const simRef = db.collection('sims').doc(simId);
    const simSnap = await simRef.get();
    if (!simSnap.exists) {
      return res.status(404).json({ error: 'SIM not found' });
    }
    const simData = simSnap.data();
    if (simData.uid !== uid) {
      return res.status(403).json({ error: 'Not authorized to deactivate this SIM' });
    }

    try {
      await submitToBlockchain({
        action: 'deactivateSim',
        cnic: user.cnic,
        mobileNumber: simData.mobileNumber,
        transactionId: simData.transactionId,
        simId,
        uid,
        timestamp: new Date().toISOString(),
      });
    } catch (fabricError) {
      console.error('Fabric submit failed (deactivateSim):', fabricError);
      if (String(process.env.FABRIC_ENABLED || '').toLowerCase() !== 'false') {
        return res.status(503).json({
          error: 'Distributed ledger unavailable',
          message: fabricError.message || 'Could not record deactivation on Hyperledger Fabric.',
        });
      }
    }

    await simRef.delete();

    // Delete associated order
    const ordersSnapshot = await db.collection('orders').where('simId', '==', simId).where('uid', '==', uid).limit(1).get();
    if (!ordersSnapshot.empty) {
      await ordersSnapshot.docs[0].ref.delete();
    }

    const updatedSims = user.registeredSims?.filter(sim => sim.simId !== simId) || [];

    await db.collection('users').doc(uid).set({
      registeredSims: updatedSims,
      updatedAt: new Date()
    }, { merge: true });

    // Audit log
    await auditLog({
      userId: uid,
      action: 'SIM_DEACTIVATION',
      details: {
        simId,
        transactionId: simData.transactionId,
        mobileNumber: simData.mobileNumber,
        timestamp: new Date().toISOString()
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({
      success: true,
      message: 'SIM deactivated successfully',
      sim: { id: simId, status: 'inactive' }
    });

  } catch (error) {
    console.error('Deactivate SIM error:', error);
    res.status(500).json({ error: 'Failed to deactivate SIM' });
  }
});

// LEGACY DEACTIVATE SIM endpoint (for backward compatibility)
router.post('/deactivate/:transactionId', verifyJWT, async (req, res) => {
  try {
    const { uid } = req.user;
    const { transactionId } = req.params;

    const userDoc = await db.collection('users').doc(uid).get();
    const user = userDoc.data();

    const simToDeactivate = user.registeredSims?.find(sim => sim.transactionId === transactionId);
    if (!simToDeactivate) {
      return res.status(404).json({ error: 'SIM not found' });
    }

    const simSnapshot = await db.collection('sims')
      .where('transactionId', '==', transactionId)
      .limit(1)
      .get();

    if (simSnapshot.empty) {
      return res.status(404).json({ error: 'SIM document not found' });
    }

    const simDoc = simSnapshot.docs[0];
    const simData = simDoc.data();
    if (simData.uid !== uid) {
      return res.status(403).json({ error: 'Not authorized to deactivate this SIM' });
    }

    try {
      await submitToBlockchain({
        action: 'deactivateSim',
        cnic: user.cnic,
        mobileNumber: simToDeactivate.mobileNumber,
        transactionId,
        simId: simDoc.id,
        uid,
        timestamp: new Date().toISOString(),
      });
    } catch (fabricError) {
      console.error('Fabric submit failed (legacy deactivateSim):', fabricError);
      if (String(process.env.FABRIC_ENABLED || '').toLowerCase() !== 'false') {
        return res.status(503).json({
          error: 'Distributed ledger unavailable',
          message: fabricError.message || 'Could not record deactivation on Hyperledger Fabric.',
        });
      }
    }

    await db.collection('sims').doc(simDoc.id).update({
      status: 'inactive',
      deactivationDate: new Date(),
      updatedAt: new Date(),
    });

    const updatedSims = user.registeredSims.map(sim => {
      if (sim.transactionId === transactionId) {
        return { ...sim, status: 'inactive', deactivationDate: new Date().toISOString() };
      }
      return sim;
    });

    await db.collection('users').doc(uid).update({
      registeredSims: updatedSims,
      updatedAt: new Date(),
    });

    // Audit log
    await auditLog({
      userId: uid,
      action: 'SIM_DEACTIVATION',
      details: {
        transactionId,
        mobileNumber: simToDeactivate.mobileNumber,
        timestamp: new Date().toISOString()
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({
      success: true,
      message: 'SIM deactivated successfully',
      updatedSims
    });

  } catch (error) {
    console.error('Deactivate SIM error:', error);
    res.status(500).json({ error: 'Failed to deactivate SIM' });
  }
});

// TRACK ORDER endpoint
router.get('/track/:trackingNumber', async (req, res) => {
  try {
    const { trackingNumber } = req.params;

    const orderSnapshot = await db.collection('orders')
      .where('trackingNumber', '==', trackingNumber)
      .limit(1)
      .get();

    if (orderSnapshot.empty) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderSnapshot.docs[0].data();

    res.json({
      success: true,
      order: {
        trackingNumber: order.trackingNumber,
        transactionId: order.transactionId,
        fabricTxId: order.fabricTxId || null,
        status: order.status,
        orderDate: order.orderDate,
        estimatedDelivery: order.estimatedDelivery,
        timeline: order.timeline
      }
    });

  } catch (error) {
    console.error('Track order error:', error);
    res.status(500).json({ error: 'Failed to track order' });
  }
});

module.exports = router;
