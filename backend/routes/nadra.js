/**
 * NADRA Proxy Routes
 * ===================
 * These routes proxy identity-verification requests from the DIMS-SR backend
 * to the separate NADRA Mock API server (port 4000).
 *
 * All routes here are internal – they are NOT directly called by the frontend.
 * They are called from other backend routes (firebase-auth.js, firebase-sim-registration.js)
 * via the nadra-service.js utility.
 */

const express = require('express');
const router = express.Router();
const { verifyUserWithNadra, verifyFingerprintWithNadra, getUserFromNadra } = require('../utils/nadra-service');
const { verifyJWT } = require('../middleware/auth');

/**
 * POST /api/nadra/verify-user
 * Verify a citizen's identity against NADRA records.
 */
router.post('/verify-user', verifyJWT, async (req, res) => {
  try {
    const { cnic, name, fatherName, dateOfBirth } = req.body;

    if (!cnic) {
      return res.status(400).json({ error: 'CNIC is required' });
    }

    const result = await verifyUserWithNadra(cnic, name, fatherName, dateOfBirth);
    res.json(result);
  } catch (error) {
    console.error('[Error] NADRA verify-user proxy:', error.message);
    res.status(503).json({ error: 'NADRA verification service unavailable' });
  }
});

/**
 * POST /api/nadra/verify-fingerprint
 * Verify a fingerprint image against NADRA biometric database.
 */
router.post('/verify-fingerprint', verifyJWT, async (req, res) => {
  try {
    const { cnic, fingerprintImages, fingerprintImage } = req.body;
    const images = Array.isArray(fingerprintImages)
      ? fingerprintImages
      : fingerprintImage ? [fingerprintImage] : [];

    if (!cnic || images.length === 0) {
      return res.status(400).json({ error: 'CNIC and at least one fingerprint image are required' });
    }

    const result = await verifyFingerprintWithNadra(cnic, images);
    res.json(result);
  } catch (error) {
    console.error('[Error] NADRA verify-fingerprint proxy:', error.message);
    res.status(503).json({ error: 'NADRA fingerprint verification service unavailable' });
  }
});

/**
 * GET /api/nadra/citizen/:cnic
 * Fetch citizen data from NADRA (restricted, admin only).
 */
router.get('/citizen/:cnic', verifyJWT, async (req, res) => {
  try {
    const { cnic } = req.params;
    const citizen = await getUserFromNadra(cnic);
    res.json(citizen);
  } catch (error) {
    console.error('[Error] NADRA citizen fetch proxy:', error.message);
    res.status(503).json({ error: 'NADRA service unavailable' });
  }
});

module.exports = router;