# Firebase Migration Guide - DIMS-SR

This guide covers the complete migration from PostgreSQL to Firebase Firestore with cross-platform support (Web, React Native, Electron).

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│         DIMS-SR Applications                         │
├──────────┬──────────────┬──────────────┬────────────┤
│   Web    │  React Native│   Electron   │  Backend   │
│  (Next)  │   (Mobile)   │  (Desktop)   │  (Node.js) │
└──────────┴──────────────┴──────────────┴────────────┘
           ↓              ↓              ↓
┌─────────────────────────────────────────────────────┐
│         Express API Server (HTTPS/TLS)              │
│  - JWT Authentication                               │
│  - MFA (TOTP)                                       │
│  - Rate Limiting                                    │
│  - Input Validation                                 │
│  - Audit Logging                                    │
└─────────────────────────────────────────────────────┘
           ↓              ↓              ↓
┌─────────────────────────────────────────────────────┐
│         Firebase Firestore Database                 │
│  - Users Collection                                 │
│  - SIMs Collection                                  │
│  - Orders Collection                                │
│  - Sessions Collection                              │
│  - Audit Logs Collection                            │
└─────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────┐
│    Hyperledger Fabric (Event Logging)               │
│  - Immutable transaction records                    │
│  - Business rule enforcement                        │
│  - Compliance tracking                              │
└─────────────────────────────────────────────────────┘
```

## Key Changes from PostgreSQL

### What's Different

| Aspect | PostgreSQL | Firebase |
|--------|------------|----------|
| Database | Relational tables | NoSQL collections |
| Queries | SQL with JOINs | Document queries |
| Transactions | ACID guaranteed | Limited batching |
| Authentication | JWT tokens only | JWT + Firebase Auth |
| Scaling | Vertical + Horizontal | Auto-scales globally |
| Offline | Limited | Native offline support |
| Backups | Manual | Automatic |

### What's the Same

- **Security**: Still using bcrypt for passwords, HTTPS/TLS encryption
- **Authentication Flow**: Still JWT-based with refresh tokens
- **MFA**: Still TOTP-based with QR codes
- **Business Logic**: Still enforced at API + Firestore rules levels
- **Audit Logging**: Still comprehensive event tracking

## Firebase Collections Structure

### 1. `users` Collection
```
documents: {uid}
{
  uid: string (Firebase UID),
  email: string,
  name: string,
  fatherName: string,
  cnic: string (13 digits),
  cnicIssueDate: timestamp,
  passwordHash: string,
  mfaEnabled: boolean,
  mfaSecret: string,
  mfaVerified: boolean,
  accountStatus: 'active' | 'inactive' | 'suspended',
  loginAttempts: number,
  lastLoginAttempt: timestamp,
  registeredSims: array,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### 2. `sims` Collection
```
Stores registered SIM details
Indexed on: uid, cnic, mobileNumber, status
```

### 3. `orders` Collection
```
Stores order tracking information
Indexed on: uid, trackingNumber, status
```

### 4. `sessions` Collection
```
Stores user sessions for JWT refresh tokens
Indexed on: uid, expiresAt
TTL: Automatic deletion after 7 days
```

### 5. `auditLogs` Collection
```
Stores all user actions for compliance
Indexed on: userId, timestamp, action
TTL: Keep for 1 year
```

## Firestore Security Rules

All rules are defined in `/backend/firestore.rules`:

- **Users can only access their own documents**
- **SIMs can only be modified by owner**
- **Orders are immutable after creation**
- **Sessions cannot be accessed by users**
- **Audit logs cannot be modified**

## Backend Setup

### Installation

```bash
cd backend
npm install
```

### Environment Configuration

```bash
cp .env.firebase.example .env
```

Fill in your Firebase credentials from Firebase Console.

### Start Server

```bash
# Development
npm run dev

# Production
npm start
```

Server runs on `https://localhost:3001`

## API Endpoints

### Authentication

```
POST /api/auth/signup
POST /api/auth/login
POST /api/auth/mfa/setup
POST /api/auth/mfa/verify
POST /api/auth/mfa/verify-login
POST /api/auth/refresh
POST /api/auth/logout
```

### SIM Management

```
POST /api/sim/register
GET /api/sim/my-sims
POST /api/sim/deactivate/:transactionId
GET /api/sim/track/:trackingNumber
```

### User Settings

```
PUT /api/user/profile
POST /api/user/change-password
POST /api/user/change-email
GET /api/user/mfa/setup
POST /api/user/mfa/verify
POST /api/user/mfa/disable
```

## React Native Mobile App Setup

### Installation

```bash
cd mobile
npm install
npx expo prebuild
npx expo run:android  # or run:ios
```

### Environment Variables

```bash
cp .env.example .env
```

### Key Files

- `/src/context/AuthContext.tsx` - Authentication state management
- `/src/hooks/useFirebase.ts` - Firebase operations (SIM registration, etc.)
- `/src/utils/api-client.ts` - API client with auto token refresh

### Features

- Secure token storage in AsyncStorage
- Automatic token refresh
- Biometric authentication support (ready to integrate)
- Offline-first design with Firestore offline persistence

## Electron Desktop App Setup

### Installation

```bash
cd desktop
npm install
npm run dev
```

### Build for Distribution

```bash
npm run build:mac      # macOS
npm run build:windows  # Windows
npm run build:linux    # Linux
```

### Key Files

- `/public/electron.js` - Main process with security
- `/public/preload.js` - Secure IPC bridge
- `/src/context/AuthContext.tsx` - Authentication
- `/src/hooks/useFirebase.ts` - Firebase operations

### Security Features

- Content Security Policy (CSP)
- Secure IPC communication
- No node integration in renderer
- Encrypted localStorage

## Web App (Next.js) Updates

The existing web app at `/app` works with Firebase through the API layer. No changes needed to the frontend components - they connect to the backend API which handles Firebase.

## Migration Checklist

### Phase 1: Setup
- [ ] Create Firebase project
- [ ] Download service account key
- [ ] Setup Firestore database
- [ ] Enable Authentication
- [ ] Deploy security rules

### Phase 2: Backend
- [ ] Install dependencies
- [ ] Configure environment variables
- [ ] Generate SSL certificates
- [ ] Deploy backend server
- [ ] Verify API endpoints

### Phase 3: Mobile App
- [ ] Setup React Native
- [ ] Configure Firebase credentials
- [ ] Test authentication flow
- [ ] Build APK/IPA
- [ ] Deploy to app stores

### Phase 4: Desktop App
- [ ] Setup Electron
- [ ] Configure Firebase
- [ ] Test authentication
- [ ] Build installers
- [ ] Deploy updates

### Phase 5: Testing
- [ ] End-to-end tests
- [ ] Security audit
- [ ] Load testing
- [ ] User acceptance testing

## Common Tasks

### Adding a New Collection

1. Define structure in Firestore
2. Add security rules in `firestore.rules`
3. Create API endpoint in backend
4. Add hook method in `useFirebase.ts`
5. Deploy rules

### Modifying User Data

```typescript
// In backend route
await db.collection('users').doc(uid).update({
  name: newName,
  updatedAt: new Date()
});
```

### Querying Data

```typescript
// Find user by CNIC
const userSnapshot = await db.collection('users')
  .where('cnic', '==', cnic)
  .limit(1)
  .get();

// Get active SIMs for user
const simsSnapshot = await db.collection('sims')
  .where('uid', '==', uid)
  .where('status', '==', 'active')
  .get();
```

### Batch Operations

```typescript
const batch = db.batch();

const userRef = db.collection('users').doc(uid);
batch.update(userRef, { registeredSims: [...] });

const simRef = db.collection('sims').doc(simId);
batch.update(simRef, { status: 'active' });

await batch.commit();
```

## Performance Optimization

### Indexing

Firestore automatically suggests indexes. Common ones for DIMS-SR:
- users: uid, status
- sims: uid, status, registrationDate
- orders: uid, status, orderDate

### Query Optimization

```typescript
// Good: Specific query with indexing
db.collection('sims').where('uid', '==', uid).where('status', '==', 'active')

// Avoid: Multiple conditions without index
db.collection('sims').where('status', '==', 'active').where('registrationDate', '>', date)
```

### Caching Strategy

- Access tokens: 15 minutes
- User data: Cache after login, refresh on settings change
- SIM list: Refresh on registration/deactivation
- Orders: Cache for tracking session

## Monitoring & Debugging

### Firebase Console

- View real-time database operations
- Monitor authentication events
- Check security rules violations
- View performance metrics

### Backend Logs

```bash
# Watch logs
npm run logs

# Filter by action
npm run logs -- --grep "SIM_REGISTRATION"
```

### Network Debugging

```typescript
// Enable logging in development
if (process.env.NODE_ENV === 'development') {
  axiosInstance.interceptors.response.use(response => {
    console.log('[API Response]', response.config.url, response.data);
    return response;
  });
}
```

## Backup & Recovery

### Automatic Backups

Firebase automatically backs up data. To manually export:

```bash
firebase firestore:export ./backups/$(date +%Y%m%d)
```

### Disaster Recovery

1. All data is geographically replicated
2. Point-in-time recovery available
3. 30-day restore window
4. Contact Firebase support for older backups

## Production Deployment

### Pre-Deployment Checklist

- [ ] Security rules reviewed and tested
- [ ] API rate limits configured
- [ ] SSL certificates installed
- [ ] Error logging setup
- [ ] Monitoring alerts configured
- [ ] Database backups scheduled
- [ ] Load testing completed
- [ ] Security audit passed

### Deployment Steps

1. Backend: Deploy to Google Cloud Run or Firebase Hosting
2. Mobile: Submit to App Store and Google Play
3. Desktop: Publish installers to download server
4. Web: Deploy Next.js app

### Post-Deployment

1. Monitor Firebase metrics
2. Check error rates
3. Verify all endpoints responding
4. Monitor user feedback

## Troubleshooting

### Authentication Issues

**Problem**: "Invalid refresh token"
**Solution**: Clear localStorage and re-login

**Problem**: "MFA code expired"
**Solution**: Codes expire after 30 seconds; rescan QR or use backup codes

### Firestore Issues

**Problem**: "Permission denied on read"
**Solution**: Check security rules match user UID

**Problem**: "Quota exceeded"
**Solution**: Check indexing; contact Firebase support for quota increase

### Network Issues

**Problem**: "SSL certificate error"
**Solution**: Regenerate certificates with `bash scripts/generate-certs.sh`

**Problem**: "CORS errors"
**Solution**: Update CORS_ORIGIN in .env

## Support & Resources

- Firebase Docs: https://firebase.google.com/docs
- Node.js Security: https://nodejs.org/en/docs/guides/security/
- Firestore Best Practices: https://firebase.google.com/docs/firestore/best-practices
- OWASP Security: https://owasp.org/

## Next Steps

1. Complete Firebase setup following FIREBASE_SETUP.md
2. Deploy backend using server-firebase.js
3. Configure React Native app with Firebase credentials
4. Build and test Electron desktop app
5. Migrate existing web app to use new backend
6. Run comprehensive security audit
7. Load test with expected user volume
8. Deploy to production

---

**Last Updated**: January 30, 2026
**Version**: 1.0
