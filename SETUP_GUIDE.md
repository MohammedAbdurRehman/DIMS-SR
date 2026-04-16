# DIMS-SR Application - Complete Step-by-Step Configuration Guide

This guide walks you through configuring and running the entire DIMS-SR (Digital Identity Management System - SIM Registration) application across all platforms.

## Prerequisites

Before starting, ensure you have installed:
- Node.js 18+ ([Download](https://nodejs.org/))
- npm or yarn package manager
- Git ([Download](https://git-scm.com/))
- Docker & Docker Compose (for Hyperledger Fabric - optional)
- Android Studio (for React Native iOS/Android builds)
- Xcode (for macOS/iOS development)

## Part 1: Firebase Setup (Most Important)

### Step 1.1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add Project"
3. Enter project name: `dims-sr`
4. Disable Google Analytics (optional)
5. Click "Create Project"
6. Wait for project creation to complete

### Step 1.2: Enable Firebase Services

In the Firebase Console:

1. **Enable Firestore Database:**
   - Left sidebar → "Firestore Database"
   - Click "Create Database"
   - Select region (closest to your location)
   - Start in **Test Mode** (we'll add security rules later)
   - Click "Create"

2. **Enable Firebase Authentication:**
   - Left sidebar → "Authentication"
   - Click "Get Started"
   - Enable "Email/Password" provider
   - Enable "Google" provider (optional)
   - Click "Save"

3. **Enable Firebase Storage (optional, for document uploads):**
   - Left sidebar → "Storage"
   - Click "Get Started"
   - Use default settings
   - Click "Done"

### Step 1.3: Get Firebase Configuration

1. In Firebase Console, click the gear icon ⚙️ → "Project Settings"
2. Scroll to "Your apps" section
3. Click "Web" icon to create a web app
4. Enter app name: `dims-sr-web`
5. Click "Register app"
6. Copy the Firebase configuration object that appears - **Save this, you'll need it**
7. Repeat for Android, iOS, and Desktop apps as needed

Your config will look like:
```javascript
{
  apiKey: "AIzaSy...",
  authDomain: "dims-sr-xxx.firebaseapp.com",
  projectId: "dims-sr-xxx",
  storageBucket: "dims-sr-xxx.appspot.com",
  messagingSenderId: "123...",
  appId: "1:123..."
}
```

### Step 1.4: Setup Firestore Security Rules

1. In Firebase Console → Firestore Database → Rules tab
2. Replace default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own documents
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    
    // SIMs - users can read/write their own SIMs
    match /sims/{simId} {
      allow read, write: if request.auth.uid == resource.data.userId;
      allow create: if request.auth.uid == request.resource.data.userId;
    }
    
    // Orders - users can read/write their own orders
    match /orders/{orderId} {
      allow read, write: if request.auth.uid == resource.data.userId;
      allow create: if request.auth.uid == request.resource.data.userId;
    }
    
    // Sessions - only read own sessions
    match /sessions/{sessionId} {
      allow read: if request.auth.uid == resource.data.userId;
      allow create: if request.auth.uid == request.resource.data.userId;
    }
    
    // Audit logs - only admins can read (for now, just backend)
    match /auditLogs/{logId} {
      allow read, write: if false; // Backend only via Admin SDK
    }
  }
}
```

3. Click "Publish"

---

## Part 2: Frontend Web App Configuration

### Step 2.1: Install Dependencies

```bash
# Navigate to web app directory
cd app

# Install dependencies
npm install
```

### Step 2.2: Configure Environment Variables

1. Create `.env.local` file in the root:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_APP_ID
```

Replace with your Firebase config from Step 1.3

### Step 2.3: Run Frontend Web App

```bash
npm run dev
```

App will be available at: `http://localhost:3000`

---

## Part 3: Backend API Configuration

### Step 3.1: Install Dependencies

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install
```

### Step 3.2: Download Firebase Service Account Key

1. Go to Firebase Console → Settings ⚙️ → Service Accounts tab
2. Click "Generate New Private Key"
3. A JSON file will download (keep it safe!)
4. Place it in `/backend/config/` folder as `firebase-admin-key.json`

### Step 3.3: Configure Environment Variables

Create `.env` file in `/backend`:

```bash
# Firebase
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_storage_bucket
FIREBASE_SERVICE_ACCOUNT_KEY_PATH=./config/firebase-admin-key.json

# Server
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# JWT
JWT_SECRET=your_super_secret_jwt_key_min_32_chars_long_please
JWT_REFRESH_SECRET=your_super_secret_refresh_key_min_32_chars_long

# SSL/TLS (optional for development)
SSL_CERT_PATH=./certs/server.crt
SSL_KEY_PATH=./certs/server.key

# Hyperledger Fabric (if using)
FABRIC_MSP_ID=Org1MSP
FABRIC_CHANNEL_NAME=dimssrchannel
FABRIC_CHAINCODE_NAME=sim-registry
FABRIC_GATEWAY_DISCOVERY=true
```

### Step 3.4: Generate SSL Certificates (Development)

```bash
cd backend
chmod +x scripts/generate-certs.sh
./scripts/generate-certs.sh
```

### Step 3.5: Run Backend API

```bash
npm run dev
```

Server will start at: `https://localhost:3001`

---

## Part 4: React Native Mobile App Configuration

### Step 4.1: Install Dependencies

```bash
cd mobile
npm install
```

### Step 4.2: Configure Firebase

Create `src/config/firebase.ts`:

```typescript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

### Step 4.3: Configure API Base URL

Create `src/config/api.ts`:

```typescript
export const API_URL = 'http://YOUR_BACKEND_IP:3001';
// For local testing: 'http://localhost:3001'
// For network testing: 'http://192.168.x.x:3001'
```

### Step 4.4: Run Mobile App

**For Android:**
```bash
npx react-native run-android
```

**For iOS:**
```bash
npx react-native run-ios
```

---

## Part 5: Electron Desktop App Configuration

### Step 5.1: Install Dependencies

```bash
cd desktop
npm install
```

### Step 5.2: Configure Firebase

Create `src/config/firebase.ts`:

```typescript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

### Step 5.3: Configure Backend URL

Update `public/electron.js`:

```javascript
const API_URL = 'http://localhost:3001'; // Change for production
```

### Step 5.4: Run Desktop App

**Development Mode:**
```bash
npm run dev
```

**Build Application:**
```bash
npm run build
# Output: dist/
```

---

## Part 6: Hyperledger Fabric Setup (Optional)

### Step 6.1: Start Fabric Network

```bash
docker-compose -f docker-compose-fabric.yml up -d
```

### Step 6.2: Deploy Chaincode

```bash
cd chaincode/sim-registry
npm install
# Package the chaincode
tar cfz sim-registry.tar.gz *
```

### Step 6.3: Install & Approve Chaincode

Use Fabric CLI:
```bash
# Install on peer
peer lifecycle chaincode install sim-registry.tar.gz

# Get package ID and approve
peer lifecycle chaincode approveformyorg \
  --channelID dimssrchannel \
  --name sim-registry \
  --version 1.0 \
  --package-id <PACKAGE_ID>

# Commit to channel
peer lifecycle chaincode commit \
  --channelID dimssrchannel \
  --name sim-registry \
  --version 1.0
```

---

## Part 7: Running Everything Together

### Quick Start Script

Create `start-dev.sh`:

```bash
#!/bin/bash

# Start backend
echo "Starting backend..."
cd backend
npm run dev &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start frontend
echo "Starting frontend..."
cd ../app
npm run dev &
FRONTEND_PID=$!

echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "Frontend: http://localhost:3000"
echo "Backend: https://localhost:3001"
echo ""
echo "To stop, run: kill $BACKEND_PID $FRONTEND_PID"
```

Run it:
```bash
chmod +x start-dev.sh
./start-dev.sh
```

### Complete Development Setup

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd app
npm run dev
```

**Terminal 3 - Mobile (optional):**
```bash
cd mobile
npm start
```

**Terminal 4 - Desktop (optional):**
```bash
cd desktop
npm run dev
```

---

## Part 8: Testing the Application

### 8.1: Test Frontend

1. Open http://localhost:3000
2. Click "Create Account"
3. Fill in details:
   - Name: Test User
   - Father Name: Test Father
   - CNIC: 12345-1234567-1
   - Issue Date: 01-01-2020
   - Email: test@example.com
   - Password: TestPass123!
4. Click "Next"
5. Set up MFA - scan QR code with authenticator app
6. Complete registration

### 8.2: Test Login

1. Go to login page
2. Enter CNIC and password
3. Enter 6-digit code from authenticator
4. Access home dashboard

### 8.3: Test SIM Registration

1. On home page, click "Register New SIM"
2. Select network provider: Jazz
3. Select mobile number
4. Confirm payment method: Cash on Delivery
5. Enter delivery address
6. Confirm order
7. Get tracking number

---

## Part 9: Troubleshooting

### Issue: Frontend can't connect to backend

**Solution:**
```bash
# Check backend is running on port 3001
lsof -i :3001

# Update NEXT_PUBLIC_API_URL in .env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Issue: Firebase auth not working

**Solution:**
1. Verify Firebase config in `.env.local`
2. Check Authentication is enabled in Firebase Console
3. Verify Email/Password provider is enabled

### Issue: CORS errors

**Solution:**
In `/backend/.env`:
```bash
CORS_ORIGIN=http://localhost:3000
```

### Issue: SSL certificate errors

**Solution:**
```bash
cd backend
rm -rf certs/
./scripts/generate-certs.sh
```

### Issue: Firestore not saving data

**Solution:**
1. Check Firestore security rules are published
2. Verify user is authenticated
3. Check Firestore collections exist
4. Review browser console for errors

---

## Part 10: Production Deployment

### Deploy Frontend (Vercel)

```bash
cd app
vercel deploy
```

### Deploy Backend (Railway/Render/Heroku)

```bash
cd backend
# Set environment variables in platform
# Deploy using platform's CLI or GitHub connection
```

### Deploy Electron (Package for Distribution)

```bash
cd desktop
npm run build
# Apps created in: dist/
# Windows: dims-sr-setup.exe
# macOS: dims-sr.dmg
# Linux: dims-sr.AppImage
```

---

## Quick Reference

| Service | URL | Port | Command |
|---------|-----|------|---------|
| Frontend | http://localhost:3000 | 3000 | `cd app && npm run dev` |
| Backend | https://localhost:3001 | 3001 | `cd backend && npm run dev` |
| Mobile | Android/iOS | - | `cd mobile && npm start` |
| Desktop | Native App | - | `cd desktop && npm run dev` |
| Firebase | Web Console | - | https://console.firebase.google.com |
| Firestore | Web Console | - | https://console.firebase.google.com |

---

## Getting Help

If you encounter issues:
1. Check error messages in console logs
2. Verify environment variables are correct
3. Ensure all dependencies are installed
4. Check Firebase Console for errors
5. Review security rules in Firestore
6. Check CORS settings in backend

For security issues or bugs, create an issue in your repository.
