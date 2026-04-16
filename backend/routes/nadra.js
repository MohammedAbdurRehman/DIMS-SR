/**
 * NADRA Integrated Routes
 * =======================
 * Handles identity verification using mock NADRA database.
 * Now integrated into backend for Vercel serverless compatibility.
 *
 * Endpoints:
 *  POST /api/nadra/verify-user       - Verify citizen identity
 *  POST /api/nadra/verify-fingerprint - Verify fingerprint biometric
 *  GET  /api/nadra/citizen/:cnic     - Fetch citizen record
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { verifyJWT } = require('../middleware/auth');

// ============= MOCK NADRA DATABASE =============
const MOCK_NADRA_DATA = {
  '34203-6348972-7': {
    cnic: '34203-6348972-7',
    name: 'MUHAMMAD ABDUL REHMAN',
    fatherName: 'ABDUL REHMAN KHAN',
    dateOfBirth: '1990-01-01',
    gender: 'M',
    address: 'KARACHI, SINDH',
    province: 'SINDH',
    status: 'active',
    verified: true,
  },
  '42301-7331552-4': {
    cnic: '42301-7331552-4',
    name: 'Ayesha Kashif',
    fatherName: 'Kashif Majeed',
    dateOfBirth: '1988-08-12',
    gender: 'F',
    address: 'RAWALPINDI, PUNJAB',
    province: 'PUNJAB',
    status: 'active',
    verified: true,
  },
  '42101-1234567-8': {
    cnic: '42101-1234567-8',
    name: 'SANA KHAN',
    fatherName: 'SHAHID KHAN',
    dateOfBirth: '1995-04-05',
    gender: 'F',
    address: 'PESHAWAR, KPK',
    province: 'KPK',
    status: 'active',
    verified: true,
  },
};

// ============= HELPER FUNCTIONS =============
function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function normalizeCNIC(cnic) {
  const digits = cnic.replace(/\D/g, '');
  if (digits.length !== 13) {
    return cnic;
  }
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

// ============= ROUTES =============

/**
 * POST /api/nadra/verify-user
 * Verify a citizen's identity against NADRA mock database
 */
router.post('/verify-user', async (req, res) => {
  try {
    const { cnic, name, fatherName, dateOfBirth } = req.body;

    if (!cnic) {
      return res.status(400).json({ error: 'CNIC is required' });
    }

    const normalizedCnic = normalizeCNIC(cnic);
    const citizen = MOCK_NADRA_DATA[normalizedCnic];

    if (!citizen) {
      return res.json({
        success: false,
        verified: false,
        message: 'Citizen not found in NADRA database',
      });
    }

    // Verify name and father name if provided
    if (name && citizen.name.toUpperCase() !== name.toUpperCase()) {
      return res.json({
        success: false,
        verified: false,
        message: 'Name mismatch',
      });
    }

    if (fatherName && citizen.fatherName.toUpperCase() !== fatherName.toUpperCase()) {
      return res.json({
        success: false,
        verified: false,
        message: 'Father name mismatch',
      });
    }

    return res.json({
      success: true,
      verified: true,
      message: 'User verified successfully',
      user: {
        cnic: citizen.cnic,
        name: citizen.name,
        fatherName: citizen.fatherName,
        dateOfBirth: citizen.dateOfBirth,
        gender: citizen.gender,
        province: citizen.province,
      },
    });
  } catch (error) {
    console.error('[Error] NADRA verify-user:', error.message);
    res.status(500).json({ error: 'NADRA verification failed' });
  }
});

/**
 * POST /api/nadra/verify-fingerprint
 * Verify fingerprint biometric against NADRA mock database
 */
router.post('/verify-fingerprint', async (req, res) => {
  try {
    const { cnic, fingerprintImages, fingerprintImage } = req.body;
    const images = Array.isArray(fingerprintImages)
      ? fingerprintImages
      : fingerprintImage ? [fingerprintImage] : [];

    if (!cnic || images.length === 0) {
      return res.status(400).json({
        error: 'CNIC and at least one fingerprint image are required',
      });
    }

    const normalizedCnic = normalizeCNIC(cnic);
    const citizen = MOCK_NADRA_DATA[normalizedCnic];

    if (!citizen) {
      return res.json({
        success: false,
        verified: false,
        message: 'Citizen not found in NADRA database',
      });
    }

    // Mock fingerprint verification - in production, compare actual fingerprints
    // For now, we'll consider any fingerprint valid for the citizen
    const matchPercentage = 95; // Mock match percentage

    return res.json({
      success: true,
      verified: true,
      cnic: citizen.cnic,
      matchPercentage: matchPercentage,
      message: 'Fingerprint verified successfully',
      fingerprintCount: images.length,
    });
  } catch (error) {
    console.error('[Error] NADRA verify-fingerprint:', error.message);
    res.status(500).json({ error: 'NADRA fingerprint verification failed' });
  }
});

/**
 * GET /api/nadra/citizen/:cnic
 * Fetch citizen data from NADRA (protected route)
 */
router.get('/citizen/:cnic', verifyJWT, async (req, res) => {
  try {
    const { cnic } = req.params;
    const normalizedCnic = normalizeCNIC(cnic);
    const citizen = MOCK_NADRA_DATA[normalizedCnic];

    if (!citizen) {
      return res.status(404).json({ error: 'Citizen not found' });
    }

    res.json({
      success: true,
      citizen: {
        ...citizen,
        fingerprintHash: sha256(`${citizen.cnic}_nadra_fp`),
      },
    });
  } catch (error) {
    console.error('[Error] NADRA citizen fetch:', error.message);
    res.status(500).json({ error: 'Failed to fetch citizen data' });
  }
});

module.exports = router;