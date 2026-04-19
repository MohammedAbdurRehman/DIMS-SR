/**
 * NADRA routes — delegates to nadra-service (HTTP adapter when NADRA_API_BASE_URL is set,
 * otherwise built-in mock citizens + mock fingerprint verification).
 */

const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const { verifyJWT } = require('../middleware/auth');
const {
  verifyUserWithNadra,
  verifyFingerprintWithNadra,
  getUserFromNadra,
} = require('../utils/nadra-service');

router.post('/verify-user', async (req, res) => {
  try {
    const { cnic, name, fatherName, dateOfBirth } = req.body;
    if (!cnic) {
      return res.status(400).json({ error: 'CNIC is required' });
    }
    const result = await verifyUserWithNadra(cnic, name, fatherName, dateOfBirth);
    return res.json(result);
  } catch (error) {
    console.error('[Error] NADRA verify-user:', error.message);
    return res.status(502).json({ error: 'NADRA verification failed', message: error.message });
  }
});

router.post('/verify-fingerprint', async (req, res) => {
  try {
    const { cnic, fingerprintImages, fingerprintImage } = req.body;
    const images = Array.isArray(fingerprintImages)
      ? fingerprintImages
      : fingerprintImage
        ? [fingerprintImage]
        : [];
    if (!cnic || images.length === 0) {
      return res.status(400).json({
        error: 'CNIC and at least one fingerprint image are required',
      });
    }
    const result = await verifyFingerprintWithNadra(cnic, images);
    return res.json(result);
  } catch (error) {
    console.error('[Error] NADRA verify-fingerprint:', error.message);
    return res.status(502).json({ error: 'NADRA fingerprint verification failed', message: error.message });
  }
});

router.get('/citizen/:cnic', verifyJWT, async (req, res) => {
  try {
    const { cnic } = req.params;
    const data = await getUserFromNadra(cnic);
    return res.json({
      success: true,
      citizen: {
        ...data.citizen,
        fingerprintHash: crypto.createHash('sha256').update(`${data.citizen.cnic}_nadra_fp`).digest('hex'),
      },
    });
  } catch (error) {
    console.error('[Error] NADRA citizen fetch:', error.message);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: 'Citizen not found' });
    }
    return res.status(502).json({ error: 'NADRA request failed', message: error.message });
  }
});

module.exports = router;
