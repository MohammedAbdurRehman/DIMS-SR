const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin SDK
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.join(__dirname, '../firebase-key.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('ERROR: Firebase service account key not found at:', serviceAccountPath);
  console.error('Please download your Firebase service account key from Firebase Console');
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

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
