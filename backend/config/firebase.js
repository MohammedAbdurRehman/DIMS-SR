const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin SDK
let serviceAccount;

// Try to load from environment variable first (for Vercel/production)
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch (error) {
    console.error('ERROR: Invalid FIREBASE_SERVICE_ACCOUNT JSON:', error.message);
    process.exit(1);
  }
} else {
  // Fall back to file-based loading (for local development)
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.join(__dirname, '../firebase-key.json');
  
  if (!fs.existsSync(serviceAccountPath)) {
    console.error('ERROR: Firebase service account key not found at:', serviceAccountPath);
    console.error('Please either:');
    console.error('1. Download your Firebase service account key and place it at:', serviceAccountPath);
    console.error('2. OR set the FIREBASE_SERVICE_ACCOUNT environment variable with the JSON content');
    process.exit(1);
  }
  
  serviceAccount = require(serviceAccountPath);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: process.env.FIREBASE_PROJECT_ID,
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

// Get Firestore instance
const db = admin.firestore();
const auth = admin.auth();

// Enable offline persistence for better UX
db.settings({
  ignoreUndefinedProperties: true
});

// Export for use in routes
module.exports = {
  admin,
  db,
  auth,
  FieldValue: admin.firestore.FieldValue
};
