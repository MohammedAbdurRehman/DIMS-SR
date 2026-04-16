# Firebase Setup Guide for DIMS-SR

## Overview
This guide walks you through setting up Firebase for the DIMS-SR application with Firestore database, Firebase Authentication, and security rules.

## Prerequisites
- Node.js 16+ installed
- Firebase CLI installed (`npm install -g firebase-tools`)
- Google account for Firebase project

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Create a new project"
3. Project name: `dims-sr` (or your preferred name)
4. Enable Google Analytics (optional)
5. Click "Create project" and wait for initialization

## Step 2: Get Service Account Key

1. In Firebase Console, go to Project Settings (⚙️ icon)
2. Click "Service Accounts" tab
3. Click "Generate New Private Key"
4. Save the JSON file as `/backend/firebase-key.json`
5. **IMPORTANT**: Never commit this file to version control

## Step 3: Enable Firestore Database

1. In Firebase Console, go to "Firestore Database"
2. Click "Create database"
3. Choose location (select region closest to you)
4. Start in **Production mode** for security
5. Wait for database initialization

## Step 4: Enable Firebase Authentication

1. In Firebase Console, go to "Authentication"
2. Click "Get started"
3. Enable "Email/Password" provider:
   - Click "Email/Password"
   - Enable both "Email/password" and "Email link (passwordless sign-in)"
   - Save

## Step 5: Configure Firestore Security Rules

1. In Firebase Console, go to "Firestore Database"
2. Click "Rules" tab
3. Replace content with rules from `/backend/firestore.rules`
4. Click "Publish"

## Step 6: Setup Backend Environment

1. Copy `.env.firebase.example` to `.env`:
   ```bash
   cp backend/.env.firebase.example backend/.env
   ```

2. Fill in the `.env` file with your Firebase credentials:
   ```
   FIREBASE_PROJECT_ID=your_project_id
   FIREBASE_API_KEY=your_api_key
   FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   FIREBASE_APP_ID=your_app_id
   FIREBASE_DATABASE_URL=your_database_url
   FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-key.json
   
   # Generate strong secrets:
   JWT_SECRET=$(openssl rand -base64 32)
   JWT_REFRESH_SECRET=$(openssl rand -base64 32)
   SESSION_SECRET=$(openssl rand -base64 32)
   ```

## Step 7: Setup SSL/TLS Certificates

```bash
cd backend
bash scripts/generate-certs.sh
```

## Step 8: Install Dependencies

```bash
cd backend
npm install
```

## Step 9: Start Backend Server

```bash
npm run dev
# or for production:
npm start
```

Server will run on `https://localhost:3001`

## Firestore Collections Structure

### users
```
{
  uid: string (Firebase UID),
  email: string,
  name: string,
  fatherName: string,
  cnic: string (13 digits),
  cnicIssueDate: timestamp,
  passwordHash: string,
  mfaEnabled: boolean,
  mfaSecret: string (base32 encoded),
  mfaVerified: boolean,
  accountStatus: string ('active' | 'inactive' | 'suspended'),
  loginAttempts: number,
  lastLoginAttempt: timestamp,
  registeredSims: array [
    {
      simId: string,
      mobileNumber: string,
      networkProvider: string,
      transactionId: string,
      trackingNumber: string,
      status: string ('active' | 'inactive'),
      registrationDate: string (ISO)
    }
  ],
  deactivatedSims: array,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### sims
```
{
  uid: string,
  cnic: string,
  transactionId: string,
  trackingNumber: string,
  networkProvider: string,
  mobileNumber: string,
  paymentMethod: string,
  deliveryAddress: string,
  paymentAddress: string,
  status: string ('processing' | 'active' | 'inactive'),
  registrationDate: timestamp,
  activationDate: timestamp (nullable),
  deactivationDate: timestamp (nullable),
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### orders
```
{
  uid: string,
  transactionId: string,
  trackingNumber: string,
  simId: string,
  status: string ('confirmed' | 'processing' | 'shipped' | 'in-transit' | 'delivered'),
  orderDate: timestamp,
  estimatedDelivery: timestamp,
  timeline: array [
    {
      status: string,
      timestamp: timestamp,
      description: string
    }
  ],
  createdAt: timestamp
}
```

### sessions
```
{
  uid: string,
  refreshToken: string,
  createdAt: timestamp,
  expiresAt: timestamp,
  ipAddress: string,
  userAgent: string
}
```

### auditLogs
```
{
  userId: string,
  action: string ('USER_SIGNUP' | 'USER_LOGIN' | 'SIM_REGISTRATION' | etc),
  details: object,
  ipAddress: string,
  userAgent: string,
  timestamp: timestamp
}
```

### blockchainEvents
```
{
  uid: string,
  transactionHash: string,
  action: string,
  cnic: string,
  timestamp: timestamp,
  fabricTimestamp: timestamp
}
```

## Firebase CLI Deployment (Optional)

To deploy security rules and indexes from CLI:

```bash
firebase login
firebase init
firebase deploy --only firestore:rules
```

## Troubleshooting

### Service Account Key Issues
- Ensure `firebase-key.json` is in the correct location
- Check file permissions: `chmod 600 backend/firebase-key.json`
- Verify credentials are valid in Firebase Console

### Connection Errors
- Check CORS origin in server matches client URL
- Ensure Firestore database is in "Production mode"
- Verify network connectivity to Firebase

### Authentication Issues
- Clear browser cache and cookies
- Check email verification status in Firebase Auth dashboard
- Verify password policy in Firebase Auth settings

### Security Rules Errors
- Review Firestore Rules in Firebase Console
- Check browser console for detailed error messages
- Ensure collections match exactly in rules

## Monitoring

View logs and analytics in Firebase Console:
- Authentication: User signups, logins, errors
- Firestore: Database operations, errors
- Performance: App performance metrics

## Backup Strategy

Firebase automatically backs up data, but for critical backups:

```bash
# Export Firestore data
firebase firestore:export ./backups/$(date +%Y%m%d_%H%M%S)

# Import Firestore data (if needed)
firebase firestore:import ./backups/backup_directory
```

## Security Best Practices

1. Never commit `firebase-key.json` to version control
2. Use environment variables for sensitive data
3. Regularly rotate JWT secrets
4. Review Firestore security rules quarterly
5. Enable Firebase audit logs in Cloud Audit Logs
6. Set up alerts for suspicious activities
7. Implement rate limiting on all API endpoints

## Cost Optimization

- Firestore has a free tier: 1GB storage, 50K reads/day
- Monitor usage in Firebase Console
- Set up alerts for unexpected spikes
- Consider regional database placement for latency

## Next Steps

After Firebase setup:
1. Configure React Native app with Firebase SDK
2. Setup Electron app Firebase integration
3. Deploy backend to production (Google Cloud Run or Firebase Hosting)
4. Configure Firebase Hosting for static frontend assets
