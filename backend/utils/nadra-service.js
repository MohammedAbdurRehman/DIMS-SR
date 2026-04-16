const axios = require('axios');

// NADRA Mock API server - runs on port 4000 by default
// In production this would point to the real NADRA API endpoint
const NADRA_API_BASE = process.env.NADRA_API_BASE || 'http://localhost:4000';

/**
 * Verify user with NADRA
 * @param {string} cnic - CNIC number
 * @param {string} name - User name
 * @param {string} fatherName - Father's name
 * @param {string} dateOfBirth - Date of birth
 * @returns {Promise<Object>} Verification result
 */
async function verifyUserWithNadra(cnic, name, fatherName, dateOfBirth) {
  try {
    const response = await axios.post(`${NADRA_API_BASE}/verify-user`, {
      cnic,
      name,
      fatherName,
      dateOfBirth
    });

    return response.data;
  } catch (error) {
    console.error('NADRA User Verification Error:', error.response?.data || error.message);
    throw new Error('Failed to verify user with NADRA');
  }
}

/**
 * Verify fingerprint with NADRA
 * @param {string} cnic - CNIC number
 * @param {string} fingerprintImage - Base64 encoded fingerprint image
 * @returns {Promise<Object>} Verification result
 */
async function verifyFingerprintWithNadra(cnic, fingerprintImages) {
  try {
    const images = Array.isArray(fingerprintImages)
      ? fingerprintImages
      : fingerprintImages ? [fingerprintImages] : [];

    const response = await axios.post(`${NADRA_API_BASE}/verify-fingerprint`, {
      cnic,
      fingerprintImages: images,
    });

    return response.data;
  } catch (error) {
    console.error('NADRA Fingerprint Verification Error:', error.response?.data || error.message);
    throw new Error('Failed to verify fingerprint with NADRA');
  }
}

/**
 * Get user details from NADRA
 * @param {string} cnic - CNIC number
 * @returns {Promise<Object>} User details
 */
async function getUserFromNadra(cnic) {
  try {
    const response = await axios.get(`${NADRA_API_BASE}/user/${cnic}`);
    return response.data;
  } catch (error) {
    console.error('NADRA Get User Error:', error.response?.data || error.message);
    throw new Error('Failed to get user from NADRA');
  }
}

module.exports = {
  verifyUserWithNadra,
  verifyFingerprintWithNadra,
  getUserFromNadra
};