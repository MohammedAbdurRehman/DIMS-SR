const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/firebase');
const {
  validateSIMRegistration,
  validateSIMDeactivation,
  handleValidationErrors,
  sanitizeInput,
} = require('../middleware/validation');
const { verifyJWT, requireMFA } = require('../middleware/auth');
const { verifyFingerprintWithNadra } = require('../utils/nadra-service');

/**
 * POST /api/sim/register
 * Register new SIM (requires MFA and biometric verification)
 */
router.post(
  '/register',
  verifyJWT,
  requireMFA,
  sanitizeInput,
  validateSIMRegistration,
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        mobileNetwork,
        mobileNumber,
        deliveryAddress,
        paymentAddress,
        sameAsDelivery,
        fingerprintImages: rawFingerprintImages,
        fingerprintImage: legacyFingerprintImage,
      } = req.body;
      const fingerprintImages = Array.isArray(rawFingerprintImages)
        ? rawFingerprintImages
        : legacyFingerprintImage ? [legacyFingerprintImage] : [];
      const userId = req.user.id;
      const cnic = req.user.cnic;

      // Verify fingerprint biometric against NADRA records
      const biometricResult = await verifyFingerprintWithNadra(cnic, fingerprintImages);
      if (!biometricResult.verified) {
        return res.status(403).json({
          error: 'Biometric verification failed',
          message: 'Fingerprint does not match NADRA biometric records. Please ensure you are the legitimate CNIC holder.',
          matchScore: biometricResult.matchScore,
        });
      }

      // Check if user has 5 active SIMs (enforced by smart contract)
      // const activeSIMsResult = await fabricClient.evaluateTransaction(
      //   'getActiveSIMCount',
      //   cnic
      // );
      // const activeSIMsData = JSON.parse(activeSIMsResult);
      // if (activeSIMsData.activeSIMCount >= 5) {
      //   return res.status(403).json({
      //     error: 'Maximum 5 SIMs allowed per CNIC',
      //     message: 'Please deactivate an existing SIM to register a new one'
      //   });
      // }

      // Generate transaction and tracking IDs
      const transactionId = uuidv4();
      const trackingNumber = crypto.randomBytes(12).toString('hex').toUpperCase();

      // Prepare SIM registration data
      const simRegistration = {
        transactionId,
        trackingNumber,
        cnic,
        userId,
        mobileNetwork,
        mobileNumber,
        deliveryAddress,
        paymentAddress: sameAsDelivery ? deliveryAddress : paymentAddress,
        status: 'processing',
        biometricVerified: true,
        biometricMatchScore: biometricResult.matchScore,
        registeredAt: new Date().toISOString(),
      };

      // Store SIM in database
      const simRef = await db.collection('sims').add({
        uid: userId,
        cnic,
        mobileNumber,
        networkProvider: mobileNetwork,
        status: 'processing',
        registrationDate: new Date(),
        transactionId,
        trackingNumber,
        deliveryAddress,
        paymentAddress: sameAsDelivery ? deliveryAddress : paymentAddress,
        biometricVerified: true,
        biometricMatchScore: biometricResult.matchScore,
        biometricVerifiedAt: new Date(),
        createdAt: new Date(),
      });

      // Store order in database
      const orderRef = await db.collection('orders').add({
        uid: userId,
        cnic,
        simId: simRef.id,
        transactionId,
        trackingNumber,
        orderDate: new Date(),
        status: 'processing',
        deliveryAddress,
        paymentAddress: sameAsDelivery ? deliveryAddress : paymentAddress,
        biometricVerified: true,
        biometricMatchScore: biometricResult.matchScore,
        timeline: [{
          status: 'Processing',
          timestamp: new Date(),
          description: 'SIM registration request submitted with biometric verification'
        }],
        createdAt: new Date(),
      });

      // Submit to Hyperledger Fabric blockchain
      // const result = await fabricClient.submitTransaction(
      //   'registerSIM',
      //   cnic,
      //   fullName,
      //   fatherName,
      //   dateOfBirth,
      //   mobileNumber,
      //   mobileNetwork
      // );

      // Log to audit trail
      // await logAuditEvent(userId, 'SIM_REGISTERED', 'sim', trackingNumber, req, simRegistration);

      res.status(201).json({
        message: 'SIM registration request submitted successfully',
        transactionId,
        trackingNumber,
        status: 'processing',
        details: {
          mobileNetwork,
          mobileNumber,
          deliveryAddress,
          estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days
        },
      });
    } catch (error) {
      console.error('[Error] SIM Registration:', error);
      res.status(500).json({ error: 'SIM registration failed' });
    }
  }
);

/**
 * POST /api/sim/deactivate
 * Deactivate a registered SIM (requires MFA and biometric verification)
 */
router.post(
  '/deactivate',
  verifyJWT,
  requireMFA,
  sanitizeInput,
  validateSIMDeactivation,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { simId, fingerprintImages: rawFingerprintImages, fingerprintImage: legacyFingerprintImage } = req.body;
      const fingerprintImages = Array.isArray(rawFingerprintImages)
        ? rawFingerprintImages
        : legacyFingerprintImage ? [legacyFingerprintImage] : [];
      const cnic = req.user.cnic;
      const userId = req.user.id;

      if (!simId) {
        return res.status(400).json({ error: 'SIM ID is required' });
      }

      // Verify fingerprint biometric against NADRA records
      const biometricResult = await verifyFingerprintWithNadra(cnic, fingerprintImages);
      if (!biometricResult.verified) {
        return res.status(403).json({
          error: 'Biometric verification failed',
          message: 'Fingerprint does not match NADRA biometric records. Please ensure you are the legitimate CNIC holder.',
          matchScore: biometricResult.matchScore,
        });
      }

      // Get SIM from database to verify ownership
      const simDoc = await db.collection('sims').doc(simId).get();
      if (!simDoc.exists) {
        return res.status(404).json({ error: 'SIM not found' });
      }

      const simData = simDoc.data();
      if (simData.cnic !== cnic) {
        return res.status(403).json({ error: 'You do not own this SIM' });
      }

      if (simData.status === 'inactive') {
        return res.status(400).json({ error: 'SIM is already inactive' });
      }

      // Update SIM status in database
      await db.collection('sims').doc(simId).update({
        status: 'inactive',
        deactivatedAt: new Date(),
        biometricVerified: true,
        biometricMatchScore: biometricResult.matchScore,
        biometricVerifiedAt: new Date(),
        updatedAt: new Date(),
      });

      // Update order status
      const orderQuery = await db.collection('orders')
        .where('simId', '==', simId)
        .where('uid', '==', userId)
        .limit(1)
        .get();

      if (!orderQuery.empty) {
        const orderDoc = orderQuery.docs[0];
        await orderDoc.ref.update({
          status: 'cancelled',
          cancelledAt: new Date(),
          biometricVerified: true,
          biometricMatchScore: biometricResult.matchScore,
          timeline: [
            ...orderDoc.data().timeline,
            {
              status: 'Cancelled',
              timestamp: new Date(),
              description: 'SIM deactivated with biometric verification'
            }
          ],
          updatedAt: new Date(),
        });
      }

      // Call Hyperledger Fabric chaincode
      // const result = await fabricClient.submitTransaction(
      //   'deactivateSIM',
      //   cnic,
      //   simId
      // );

      // Log deactivation
      // await logAuditEvent(userId, 'SIM_DEACTIVATED', 'sim', simId, req);

      res.json({
        message: 'SIM deactivated successfully with biometric verification',
        simId,
        status: 'inactive',
        biometricVerified: true,
        matchScore: biometricResult.matchScore,
        deactivatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[Error] SIM Deactivation:', error);
      res.status(500).json({ error: 'SIM deactivation failed' });
    }
  }
);

/**
 * GET /api/sim/registered
 * Get all SIMs registered by user
 */
router.get('/registered', verifyJWT, async (req, res) => {
  try {
    const cnic = req.user.cnic;

    // Query Hyperledger Fabric
    // const result = await fabricClient.evaluateTransaction(
    //   'getSIMsByCNIC',
    //   cnic
    // );
    // const sims = JSON.parse(result);

    // Mock response
    const sims = [
      {
        simId: 'SIM_1234567890',
        simNumber: '03001234567',
        operator: 'Jazz',
        status: 'active',
        registrationDate: new Date().toISOString(),
      },
    ];

    res.json({
      message: 'SIMs retrieved successfully',
      count: sims.length,
      sims,
    });
  } catch (error) {
    console.error('[Error] Fetching SIMs:', error);
    res.status(500).json({ error: 'Failed to fetch SIMs' });
  }
});

/**
 * GET /api/sim/track/:trackingNumber
 * Track SIM registration status
 */
router.get('/track/:trackingNumber', async (req, res) => {
  try {
    const { trackingNumber } = req.params;

    if (!trackingNumber || trackingNumber.length < 10) {
      return res.status(400).json({ error: 'Invalid tracking number' });
    }

    // Query database for tracking status
    // const result = await db.query(
    //   'SELECT * FROM blockchain_events WHERE transaction_id = $1 OR tracking_number = $1',
    //   [trackingNumber]
    // );
    // if (result.rows.length === 0) {
    //   return res.status(404).json({ error: 'Tracking number not found' });
    // }
    // const order = result.rows[0];

    // Mock response
    const order = {
      trackingNumber,
      transactionId: uuidv4(),
      status: 'in_transit',
      mobileNetwork: 'Jazz',
      mobileNumber: '03001234567',
      timeline: [
        { step: 'Processing', date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), completed: true },
        { step: 'Shipped', date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), completed: true },
        { step: 'In Transit', date: new Date().toISOString(), completed: true },
        { step: 'Delivered', date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), completed: false },
      ],
    };

    res.json({
      message: 'Order status retrieved',
      order,
    });
  } catch (error) {
    console.error('[Error] Tracking SIM:', error);
    res.status(500).json({ error: 'Failed to track order' });
  }
});

/**
 * GET /api/sim/active-count
 * Check if user can register more SIMs
 */
router.get('/active-count', verifyJWT, async (req, res) => {
  try {
    const cnic = req.user.cnic;

    // Query Hyperledger Fabric
    // const result = await fabricClient.evaluateTransaction(
    //   'getActiveSIMCount',
    //   cnic
    // );
    // const countData = JSON.parse(result);

    // Mock response
    const countData = {
      cnic,
      activeSIMCount: 3,
      canRegisterMore: true,
      remainingSlots: 2,
    };

    res.json(countData);
  } catch (error) {
    console.error('[Error] Checking SIM Count:', error);
    res.status(500).json({ error: 'Failed to check SIM count' });
  }
});

module.exports = router;
