/**
 * NADRA integration
 *
 * - If NADRA_API_BASE_URL (or NADRA_ADAPTER_URL) is set → calls the HTTP adapter
 *   (POST /verify-user, POST /verify-fingerprint, GET /citizen/:cnic).
 * - If not set → uses built-in mock citizens and mock fingerprint success so the
 *   project runs without an external NADRA service (FYP / local default).
 */

const axios = require('axios');
const crypto = require('crypto');

/** In-process mock citizens — used when no NADRA_API_BASE_URL is configured */
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
  },
};

function getBaseUrl() {
  const raw = process.env.NADRA_API_BASE_URL || process.env.NADRA_ADAPTER_URL || '';
  const trimmed = String(raw).trim().replace(/\/$/, '');
  return trimmed || null;
}

function normalizeCNIC(cnic) {
  const digits = String(cnic).replace(/\D/g, '');
  if (digits.length !== 13) return String(cnic).trim();
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function nadraAxios() {
  const baseURL = getBaseUrl();
  if (!baseURL) {
    return null;
  }
  const timeout = parseInt(process.env.NADRA_HTTP_TIMEOUT_MS || '30000', 10);
  return axios.create({
    baseURL,
    timeout,
    headers: { 'Content-Type': 'application/json' },
  });
}

function verifyUserWithNadraMock(cnic, name, fatherName, dateOfBirth) {
  const normalizedCnic = normalizeCNIC(cnic);
  const citizen = MOCK_NADRA_DATA[normalizedCnic];

  if (!citizen) {
    return {
      success: false,
      verified: false,
      message: 'Citizen not found in mock NADRA database',
    };
  }

  if (name && citizen.name.toUpperCase() !== String(name).toUpperCase()) {
    return { success: false, verified: false, message: 'Name mismatch' };
  }

  if (fatherName && citizen.fatherName.toUpperCase() !== String(fatherName).toUpperCase()) {
    return { success: false, verified: false, message: 'Father name mismatch' };
  }

  if (dateOfBirth && citizen.dateOfBirth !== dateOfBirth) {
    return { success: false, verified: false, message: 'Date of birth mismatch' };
  }

  return {
    success: true,
    verified: true,
    message: 'User verified successfully (mock NADRA)',
    user: citizen,
  };
}

function verifyFingerprintWithNadraMock(cnic, fingerprintImages) {
  const normalizedCnic = normalizeCNIC(cnic);
  const citizen = MOCK_NADRA_DATA[normalizedCnic];

  if (!citizen) {
    return {
      success: false,
      verified: false,
      message: 'Citizen not found in mock NADRA database',
    };
  }

  const images = Array.isArray(fingerprintImages)
    ? fingerprintImages
    : fingerprintImages
      ? [fingerprintImages]
      : [];

  if (images.length === 0) {
    return {
      success: false,
      verified: false,
      message: 'No fingerprint images provided',
    };
  }

  return {
    success: true,
    verified: true,
    matchPercentage: 95,
    message: 'Fingerprint verified successfully (mock NADRA)',
    fingerprintHash: sha256(`${normalizedCnic}_mock_fp`),
    fingerprintCount: images.length,
  };
}

function getUserFromNadraMock(cnic) {
  const normalizedCnic = normalizeCNIC(cnic);
  const citizen = MOCK_NADRA_DATA[normalizedCnic];
  if (!citizen) {
    throw new Error('Citizen not found in mock NADRA database');
  }
  return { success: true, citizen };
}

async function verifyUserWithNadra(cnic, name, fatherName, dateOfBirth) {
  const client = nadraAxios();
  if (!client) {
    return verifyUserWithNadraMock(cnic, name, fatherName, dateOfBirth);
  }
  try {
    const { data } = await client.post('/verify-user', {
      cnic,
      name,
      fatherName,
      dateOfBirth,
    });
    return {
      success: !!data.success,
      verified: !!data.verified,
      message: data.message || (data.verified ? 'Verified' : 'Not verified'),
      user: data.user || data.citizen,
    };
  } catch (err) {
    const msg =
      err.response?.data?.message ||
      err.response?.data?.error ||
      err.message ||
      'NADRA request failed';
    throw new Error(msg);
  }
}

async function verifyFingerprintWithNadra(cnic, fingerprintImages) {
  const client = nadraAxios();
  if (!client) {
    return verifyFingerprintWithNadraMock(cnic, fingerprintImages);
  }
  const images = Array.isArray(fingerprintImages)
    ? fingerprintImages
    : fingerprintImages
      ? [fingerprintImages]
      : [];
  if (images.length === 0) {
    return {
      success: false,
      verified: false,
      message: 'No fingerprint images provided',
    };
  }
  try {
    const { data } = await client.post('/verify-fingerprint', {
      cnic,
      fingerprintImages: images,
    });
    return {
      success: !!data.success,
      verified: !!data.verified,
      message: data.message || (data.verified ? 'Fingerprint verified' : 'Fingerprint not verified'),
      matchPercentage: data.matchPercentage,
      fingerprintHash: data.fingerprintHash,
      fingerprintCount: data.fingerprintCount ?? images.length,
    };
  } catch (err) {
    const msg =
      err.response?.data?.message ||
      err.response?.data?.error ||
      err.message ||
      'NADRA fingerprint request failed';
    throw new Error(msg);
  }
}

async function getUserFromNadra(cnic) {
  const client = nadraAxios();
  if (!client) {
    return getUserFromNadraMock(cnic);
  }
  const normalized = String(cnic).replace(/\D/g, '');
  const formatted =
    normalized.length === 13
      ? `${normalized.slice(0, 5)}-${normalized.slice(5, 12)}-${normalized.slice(12)}`
      : cnic;
  const { data } = await client.get(`/citizen/${encodeURIComponent(formatted)}`);
  if (!data || (!data.citizen && !data.success)) {
    throw new Error('Citizen not found');
  }
  return {
    success: true,
    citizen: data.citizen || data,
  };
}

module.exports = {
  verifyUserWithNadra,
  verifyFingerprintWithNadra,
  getUserFromNadra,
  getBaseUrl,
};
