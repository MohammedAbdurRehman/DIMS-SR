# DIMS-SR Configuration Checklist

Use this checklist to track your setup progress.

## Firebase Setup
- [-] Created Firebase project at firebase.google.com
- [-] Enabled Firestore Database (Test Mode)
- [ ] Enabled Firebase Authentication (Email/Password)
- [-] Downloaded Firebase config (save the JSON)
- [-] Downloaded Service Account Key (save as firebase-admin-key.json)
- [-] Added Firestore Security Rules (published)
- [-] Created web app in Firebase Console
- [-] Created Android app in Firebase Console (if needed)
- [ ] Created iOS app in Firebase Console (if needed)

## Frontend Web App Setup
- [ ] Navigated to `/app` directory
- [ ] Ran `npm install`
- [ ] Created `.env.local` file
- [ ] Added all Firebase config variables to `.env.local`
- [ ] Ran `npm run dev`
- [ ] Verified frontend loads at http://localhost:3000

## Backend API Setup
- [ ] Navigated to `/backend` directory
- [ ] Ran `npm install`
- [ ] Placed `firebase-admin-key.json` in `/backend/config/`
- [ ] Created `.env` file with all required variables
- [ ] Ran `./scripts/generate-certs.sh` (for SSL certificates)
- [ ] Ran `npm run dev`
- [ ] Verified backend runs at https://localhost:3001

## React Native Mobile App Setup
- [ ] Navigated to `/mobile` directory
- [ ] Ran `npm install`
- [ ] Created `src/config/firebase.ts` with Firebase config
- [ ] Created `src/config/api.ts` with backend URL
- [ ] Ran `npx react-native run-android` or `npm run ios`
- [ ] Verified app opens on emulator/device

## Electron Desktop App Setup
- [ ] Navigated to `/desktop` directory
- [ ] Ran `npm install`
- [ ] Created `src/config/firebase.ts` with Firebase config
- [ ] Updated backend URL in `public/electron.js`
- [ ] Ran `npm run dev`
- [ ] Verified desktop app opens

## Hyperledger Fabric Setup (Optional)
- [ ] Installed Docker & Docker Compose
- [ ] Ran `docker-compose -f docker-compose-fabric.yml up -d`
- [ ] Navigated to `/chaincode/sim-registry`
- [ ] Ran `npm install` in chaincode directory
- [ ] Deployed chaincode using Fabric CLI commands
- [ ] Verified chaincode installed successfully

## End-to-End Testing
- [ ] Tested frontend signup flow
- [ ] Tested MFA QR code setup
- [ ] Tested login with MFA
- [ ] Tested SIM registration
- [ ] Tested order tracking
- [ ] Tested view registered SIMs
- [ ] Tested settings page
- [ ] Tested MFA changes
- [ ] Tested mobile app connection
- [ ] Tested desktop app connection

## Security Configuration
- [ ] SSL certificates generated
- [ ] CORS settings configured
- [ ] JWT secrets set in environment
- [ ] Firestore security rules published
- [ ] Password validation enabled
- [ ] Rate limiting configured
- [ ] Audit logging enabled

## Final Verification
- [ ] All three apps (web, mobile, desktop) can connect to backend
- [ ] Firebase authentication working
- [ ] SIM registration saves to Firestore
- [ ] MFA verification works
- [ ] User can track orders
- [ ] Settings updates properly
- [ ] All environment variables set correctly
- [ ] No console errors in any app

## Production Ready (Before Deployment)
- [ ] Switched Firebase to Production Mode
- [ ] Updated Firestore security rules for production
- [ ] Set NODE_ENV=production in backend
- [ ] Updated API URLs (remove localhost)
- [ ] Generated new JWT secrets
- [ ] Tested all flows in production config
- [ ] Backed up Firebase service account key
- [ ] Set up monitoring/logging
- [ ] Configured HTTPS certificates
- [ ] Planned deployment strategy

## Deployment
- [ ] Frontend deployed to Vercel/Netlify/AWS
- [ ] Backend deployed to Railway/Render/Heroku
- [ ] Mobile app built and signed for Play Store/App Store
- [ ] Desktop app built and packaged
- [ ] Domain/DNS configured
- [ ] SSL certificates updated
- [ ] Database backups configured

## Post-Deployment
- [ ] Verified all services are running
- [ ] Tested from different networks
- [ ] Monitored error logs
- [ ] Collected user feedback
- [ ] Updated documentation
- [ ] Created user guide/manual

---

## Quick Command Reference

### Start All Services (Development)

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd app && npm run dev

# Terminal 3 (Mobile)
cd mobile && npm start

# Terminal 4 (Desktop)
cd desktop && npm run dev
```

### Check Service Status

```bash
# Check if frontend is running
curl http://localhost:3000

# Check if backend is running
curl https://localhost:3001 --insecure

# Check Firebase connection
npm run test:firebase
```

### Reset/Clean Setup

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Firebase cache
rm -rf ~/.firebase

# Reset SSL certificates
rm -rf backend/certs/
cd backend && ./scripts/generate-certs.sh
```

### Troubleshooting Commands

```bash
# Check port usage
lsof -i :3000  # Frontend
lsof -i :3001  # Backend

# Kill process on port
kill -9 $(lsof -t -i:3000)
kill -9 $(lsof -t -i:3001)

# View logs
tail -f backend/logs/app.log

# Test Firebase connection
node -e "require('firebase-admin').initializeApp(); console.log('Firebase connected');"
```

---

## Common Issues Quick Fixes

| Issue | Quick Fix |
|-------|-----------|
| Port already in use | Change PORT in .env or kill process on port |
| Firebase config undefined | Verify .env.local has all Firebase variables |
| CORS errors | Check CORS_ORIGIN in backend .env matches frontend URL |
| SSL errors | Regenerate certificates: `./scripts/generate-certs.sh` |
| Firestore permission denied | Check security rules are published correctly |
| Mobile app can't connect | Update API_URL to your machine's IP address |
| Desktop app won't start | Check electron.js backend URL is correct |
| MFA not working | Verify Firebase auth is enabled in console |
