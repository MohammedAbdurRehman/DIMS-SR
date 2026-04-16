const crypto = require('crypto');

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

function normalizeCNIC(cnic) {
  const digits = cnic.replace(/\D/g, '');
  if (digits.length !== 13) return cnic;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

async function verifyUserWithNadra(cnic, name, fatherName, dateOfBirth) {
  const normalizedCnic = normalizeCNIC(cnic);
  const citizen = MOCK_NADRA_DATA[normalizedCnic];

  if (!citizen) {
    console.warn('NADRA mock user not found:', normalizedCnic);
    return {
      success: false,
      verified: false,
      message: 'Citizen not found in mock NADRA database',
    };
  }

  if (name && citizen.name.toUpperCase() !== name.toUpperCase()) {
    return {
      success: false,
      verified: false,
      message: 'Name mismatch',
    };
  }

  if (fatherName && citizen.fatherName.toUpperCase() !== fatherName.toUpperCase()) {
    return {
      success: false,
      verified: false,
      message: 'Father name mismatch',
    };
  }

  if (dateOfBirth && citizen.dateOfBirth !== dateOfBirth) {
    return {
      success: false,
      verified: false,
      message: 'Date of birth mismatch',
    };
  }

  return {
    success: true,
    verified: true,
    message: 'User verified successfully',
    user: citizen,
  };
}

async function verifyFingerprintWithNadra(cnic, fingerprintImages) {
  const normalizedCnic = normalizeCNIC(cnic);
  const citizen = MOCK_NADRA_DATA[normalizedCnic];

  if (!citizen) {
    console.warn('NADRA mock fingerprint user not found:', normalizedCnic);
    return {
      success: false,
      verified: false,
      message: 'Citizen not found in mock NADRA database',
    };
  }

  const images = Array.isArray(fingerprintImages)
    ? fingerprintImages
    : fingerprintImages ? [fingerprintImages] : [];

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
    message: 'Fingerprint verified successfully',
    fingerprintHash: sha256(`${normalizedCnic}_mock_fp`),
    fingerprintCount: images.length,
  };
}

async function getUserFromNadra(cnic) {
  const normalizedCnic = normalizeCNIC(cnic);
  const citizen = MOCK_NADRA_DATA[normalizedCnic];

  if (!citizen) {
    throw new Error('Citizen not found in mock NADRA database');
  }

  return {
    success: true,
    citizen,
  };
}

module.exports = {
  verifyUserWithNadra,
  verifyFingerprintWithNadra,
  getUserFromNadra,
};