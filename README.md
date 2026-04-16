# DIMS-SR (Digital Identity Management System - SIM Registration)

A comprehensive SIM registration system with biometric verification, built with Next.js frontend and Node.js/Express backend, designed for Vercel deployment.

## Features

- **User Authentication**: Secure login/signup with JWT tokens
- **Biometric Verification**: Fingerprint capture and NADRA verification
- **SIM Registration**: Complete SIM registration workflow
- **Order Tracking**: Track SIM registration orders
- **Multi-Factor Authentication**: Enhanced security with MFA
- **Hyperledger Fabric Integration**: Blockchain-based SIM management
- **Firebase Integration**: Real-time database and authentication

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express.js, Firebase Admin SDK
- **Database**: Firebase Firestore
- **Blockchain**: Hyperledger Fabric
- **Biometric**: NADRA API integration
- **Deployment**: Vercel (monorepo setup)

## Project Structure

```
├── app/                    # Next.js app directory
├── backend/               # Express.js backend
│   ├── api/              # Vercel serverless functions
│   ├── routes/           # API routes
│   ├── middleware/       # Express middleware
│   └── config/           # Database and service configs
├── components/           # React components
├── lib/                  # Utility functions
├── public/               # Static assets
└── vercel.json          # Vercel configuration
```

## Local Development

### Prerequisites

- Node.js 18+
- pnpm or npm
- Firebase project
- Hyperledger Fabric network (optional)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   cd backend && pnpm install && cd ..
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. Start development servers:
   ```bash
   # Frontend (Next.js)
   pnpm run dev

   # Backend (in another terminal)
   cd backend && pnpm run dev

   # NADRA Mock Server (in another terminal)
   cd backend && pnpm run nadra:dev
   ```

## Vercel Deployment

### Prerequisites

- Vercel account
- Firebase project with Firestore
- Environment variables configured in Vercel

### Deployment Steps

1. **Connect Repository**: Connect your GitHub repository to Vercel

2. **Configure Build Settings**:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (leave empty)
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next` (default)

3. **Environment Variables**: Add the following in Vercel dashboard:

   #### Frontend Variables
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

   #### Backend Variables
   ```
   FIREBASE_PROJECT_ID=your_project_id
   FIREBASE_PRIVATE_KEY=your_private_key
   FIREBASE_CLIENT_EMAIL=your_client_email
   FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
   JWT_SECRET=your_jwt_secret
   NADRA_API_KEY=your_nadra_api_key
   NODE_ENV=production
   ```

4. **Deploy**: Vercel will automatically detect the monorepo structure and deploy both frontend and backend.

### API Routes

After deployment, your API will be available at:
- Frontend: `https://your-app.vercel.app`
- API Routes: `https://your-app.vercel.app/api/*`
- NADRA Routes: `https://your-app.vercel.app/nadra/*`

## Firebase Setup

1. Create a Firebase project
2. Enable Firestore Database
3. Create a service account and download the key
4. Set up security rules for Firestore
5. Configure authentication providers

## Hyperledger Fabric Setup (Optional)

1. Set up Hyperledger Fabric network
2. Configure connection profiles
3. Set up wallet and certificates
4. Deploy chaincode

## Environment Variables Reference

### Required Variables

- `NEXT_PUBLIC_API_URL`: API base URL (automatically handled in production)
- `FIREBASE_PROJECT_ID`: Firebase project ID
- `FIREBASE_PRIVATE_KEY`: Firebase service account private key
- `FIREBASE_CLIENT_EMAIL`: Firebase service account email
- `JWT_SECRET`: Secret key for JWT tokens

### Optional Variables

- `DATABASE_URL`: PostgreSQL connection string
- `FABRIC_CONNECTION_PROFILE`: Hyperledger Fabric connection profile path
- `SSL_KEY_PATH`: SSL certificate paths for HTTPS
- `SECURE_COOKIES`: Enable secure cookies (default: false in dev)

## Development Scripts

```bash
# Frontend
npm run dev          # Start Next.js development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint

# Backend
cd backend
npm run dev          # Start Express development server
npm run start        # Start production server
npm run nadra:dev    # Start NADRA mock server
```

## API Documentation

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User registration
- `POST /api/auth/refresh` - Refresh access token

### SIM Management
- `POST /api/sim/register` - Register new SIM
- `POST /api/sim/deactivate` - Deactivate SIM
- `GET /api/user/profile` - Get user profile and SIMs

### Order Tracking
- `GET /api/user/track-order/:trackingNumber` - Track order by tracking number

## Security Features

- JWT-based authentication
- Biometric verification via NADRA
- Rate limiting
- CORS protection
- Helmet security headers
- Input validation and sanitization

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please open an issue in the GitHub repository.