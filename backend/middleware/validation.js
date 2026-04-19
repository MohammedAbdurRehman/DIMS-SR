const { body, validationResult } = require('express-validator');

/**
 * Validation result handling middleware
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
      })),
    });
  }
  next();
};

/**
 * Signup validation rules
 */
const validateSignup = [
  body('fullName')
    .trim()
    .notEmpty().withMessage('Full name is required')
    .isLength({ min: 3, max: 100 }).withMessage('Name must be 3-100 characters')
    .matches(/^[a-zA-Z\s]*$/).withMessage('Name can only contain letters and spaces'),

  body('fatherName')
    .trim()
    .notEmpty().withMessage('Father name is required')
    .isLength({ min: 3, max: 100 }).withMessage('Father name must be 3-100 characters')
    .matches(/^[a-zA-Z\s]*$/).withMessage('Father name can only contain letters and spaces'),

  body('cnic')
    .trim()
    .notEmpty().withMessage('CNIC is required')
    .matches(/^\d{5}-\d{7}-\d{1}$/).withMessage('Invalid CNIC format. Use XXXXX-XXXXXXX-X'),

  body('cnicIssueDate')
    .notEmpty().withMessage('CNIC issue date is required')
    .isISO8601().withMessage('Invalid date format'),

  body('dateOfBirth')
    .notEmpty().withMessage('Date of birth is required')
    .isISO8601().withMessage('Invalid date format')
    .custom((value) => {
      const dob = new Date(value);
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        if (age < 18) {
          throw new Error('Must be 18 years or older');
        }
      } else if (age < 18) {
        throw new Error('Must be 18 years or older');
      }
      return true;
    }),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 12 }).withMessage('Password must be at least 12 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[a-zA-Z\d@$!%*?&]/)
    .withMessage('Password must include uppercase, lowercase, number, and special character'),
];

/**
 * Login validation rules
 */
const validateLogin = [
  body('cnic')
    .trim()
    .notEmpty().withMessage('CNIC is required')
    .matches(/^\d{5}-\d{7}-\d{1}$/).withMessage('Invalid CNIC format'),

  body('password')
    .notEmpty().withMessage('Password is required'),
];

/**
 * MFA verification validation
 */
const validateMFACode = [
  body('code')
    .trim()
    .notEmpty().withMessage('Verification code is required')
    .matches(/^\d{6}$/).withMessage('Code must be 6 digits'),
];

/**
 * SIM registration validation
 */
const validateSIMRegistration = [
  body('mobileNetwork')
    .notEmpty().withMessage('Mobile network is required')
    .isIn(['jazz', 'zong', 'telenor', 'warid']).withMessage('Invalid network selected'),

  body('mobileNumber')
    .trim()
    .notEmpty().withMessage('Mobile number is required')
    .matches(/^03\d{9}$/).withMessage('Invalid mobile number format'),

  body('deliveryAddress')
    .trim()
    .notEmpty().withMessage('Delivery address is required')
    .isLength({ min: 10, max: 500 }).withMessage('Address must be 10-500 characters'),

  body('paymentAddress')
    .trim()
    .optional({ checkFalsy: true })
    .isLength({ min: 10, max: 500 }).withMessage('Address must be 10-500 characters'),

  body('sameAsDelivery')
    .optional()
    .isBoolean().withMessage('Invalid value'),

  body('fingerprintImages')
    .isArray({ min: 1, max: 5 }).withMessage('At least one fingerprint image is required (up to 5)'),

  body('fingerprintImages.*')
    .isString().withMessage('Each fingerprint image must be a valid base64 string')
    .isLength({ min: 100 }).withMessage('Each fingerprint image data is too small'),
];

/**
 * SIM deactivation validation
 */
const validateSIMDeactivation = [
  body('simId')
    .notEmpty().withMessage('SIM ID is required')
    .isString().withMessage('SIM ID must be a string'),

  body('fingerprintImage')
    .notEmpty().withMessage('Fingerprint biometric verification is required')
    .isString().withMessage('Fingerprint image must be a valid base64 string')
    .isLength({ min: 100 }).withMessage('Fingerprint image data is too small'),
];

/**
 * Change email validation
 */
const validateChangeEmail = [
  body('newEmail')
    .trim()
    .notEmpty().withMessage('New email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required to change email'),

  body('mfaCode')
    .optional()
    .matches(/^\d{6}$/)
    .withMessage('MFA code must be 6 digits'),
];

/**
 * Change password validation
 */
const validateChangePassword = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),

  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 12 }).withMessage('Password must be at least 12 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[a-zA-Z\d@$!%*?&]/)
    .withMessage('Password must include uppercase, lowercase, number, and special character'),

  body('confirmPassword')
    .notEmpty().withMessage('Confirm password is required')
    .custom((value, { req }) => value === req.body.newPassword)
    .withMessage('Passwords do not match'),

  body('mfaCode')
    .optional()
    .matches(/^\d{6}$/)
    .withMessage('MFA code must be 6 digits'),
];

/**
 * Reset MFA (re-configure authenticator) — password required; MFA code when MFA is enabled
 */
const validateResetMfa = [
  body('password').notEmpty().withMessage('Password is required'),

  body('mfaCode')
    .optional()
    .matches(/^\d{6}$/)
    .withMessage('MFA code must be 6 digits'),
];

/** CNIC as digits only or formatted — 13 digits required */
const validateForgotPasswordRequest = [
  body('cnic')
    .trim()
    .notEmpty()
    .withMessage('CNIC is required')
    .custom((value) => {
      const d = String(value).replace(/\D/g, '');
      if (d.length !== 13) {
        throw new Error('CNIC must be 13 digits');
      }
      return true;
    }),
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Invalid email format').normalizeEmail(),
];

const validatePasswordResetConfirm = [
  body('resetToken').trim().notEmpty().withMessage('Reset token is required'),
  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 12 })
    .withMessage('Password must be at least 12 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[a-zA-Z\d@$!%*?&]/)
    .withMessage('Password must include uppercase, lowercase, number, and special character'),
  body('confirmPassword')
    .notEmpty()
    .withMessage('Confirm password is required')
    .custom((value, { req }) => value === req.body.newPassword)
    .withMessage('Passwords do not match'),
];

/**
 * Sanitize input to prevent XSS
 */
const sanitizeInput = (req, res, next) => {
  // Remove any HTML/script tags from string values
  const sanitize = (value) => {
    if (typeof value === 'string') {
      return value.replace(/<[^>]*>/g, '').trim();
    }
    if (typeof value === 'object' && value !== null) {
      for (const key in value) {
        value[key] = sanitize(value[key]);
      }
    }
    return value;
  };

  req.body = sanitize(req.body);
  next();
};

module.exports = {
  handleValidationErrors,
  sanitizeInput,
  validateSignup,
  validateLogin,
  validateMFACode,
  validateSIMRegistration,
  validateSIMDeactivation,
  validateChangeEmail,
  validateChangePassword,
  validateResetMfa,
  validateForgotPasswordRequest,
  validatePasswordResetConfirm,
};
