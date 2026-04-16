# DIMS-SR Backend API

Digital Identity Management System - SIM Registration backend built with Node.js, Express, PostgreSQL, and Hyperledger Fabric.

## Features

- **Secure Authentication**: JWT-based authentication with refresh tokens
- **Multi-Factor Authentication (MFA)**: TOTP-based with authenticator apps
- **Hyperledger Fabric Integration**: Blockchain-based SIM registration and validation
- **TLS/SSL Encryption**: End-to-end encrypted communication via HTTPS
- **Session Management**: Secure HTTP-only cookies with CSRF protection
- **Rate Limiting**: Protection against brute force attacks
- **Input Validation**: Comprehensive validation and sanitization
- **Audit Logging**: Complete event logging for compliance
- **Security Headers**: Helmet.js for HTTP security headers
- **SQL Injection Prevention**: Parameterized queries
- **Session Hijacking Prevention**: IP and User-Agent verification

## Prerequisites

- Node.js 16+ and npm
- PostgreSQL 12+
- Hyperledger Fabric 2.2+
- OpenSSL for certificate generation

## Installation

1. **Clone the repository**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Generate SSL/TLS certificates** (for development)
   ```bash
   chmod +x scripts/generate-certs.sh
   ./scripts/generate-certs.sh
   ```

5. **Setup PostgreSQL database**
   ```bash
   chmod +x scripts/setup-db.sh
   ./scripts/setup-db.sh
   ```

6. **Setup Hyperledger Fabric network**
   ```bash
   docker-compose -f ../docker-compose-fabric.yml up -d
   ```

7. **Deploy chaincode**
   ```bash
   # Instructions in chaincode directory
   cd ../chaincode
   ```

## Running the Server

### Development
```bash
npm run dev
```
Server runs on https://localhost:3001

### Production
```bash
NODE_ENV=production npm start
```
Ensure proper environment variables are set in production.

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new account
- `POST /api/auth/login` - User login
- `POST /api/auth/verify-mfa` - Verify MFA code
- `POST /api/auth/refresh-token` - Refresh JWT token
- `POST /api/auth/logout` - Logout user

### SIM Management
- `POST /api/sim/register` - Register new SIM
- `POST /api/sim/deactivate` - Deactivate SIM
- `GET /api/sim/registered` - Get user's SIMs
- `GET /api/sim/track/:trackingNumber` - Track order
- `GET /api/sim/active-count` - Check remaining slots

### User Settings
- `GET /api/user/profile` - Get user profile
- `POST /api/user/change-email` - Change email
- `POST /api/user/change-password` - Change password
- `POST /api/user/setup-mfa` - Setup MFA
- `POST /api/user/confirm-mfa` - Confirm MFA
- `POST /api/user/disable-mfa` - Disable MFA

## Security Features

### 1. Password Security
- Bcrypt hashing (12 salt rounds)
- Password history to prevent reuse
- Strong password requirements enforced

### 2. Token Management
- JWT tokens with expiration
- Refresh token rotation
- Token revocation support

### 3. Session Security
- HTTP-only cookies
- CSRF token validation
- IP address verification
- User-Agent validation

### 4. Input Security
- XSS prevention through sanitization
- SQL injection prevention (parameterized queries)
- Rate limiting per user and IP
- Input length restrictions

### 5. Communication Security
- HTTPS/TLS for all connections
- Strict CORS policies
- Security headers (Helmet.js)

### 6. Blockchain Integration
- Immutable event logging
- Smart contract validation
- Transaction verification

## Environment Variables

```env
# Server
PORT=3001
NODE_ENV=production
API_URL=https://localhost:3001

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=dims_user
DB_PASSWORD=secure_password
DB_NAME=dims_sr_db

# JWT
JWT_SECRET=min_32_chars_long_secret_key
JWT_EXPIRY=7d
REFRESH_TOKEN_SECRET=another_32_chars_secret
REFRESH_TOKEN_EXPIRY=30d

# Sessions
SESSION_SECRET=session_secret_32_chars_min
SESSION_EXPIRY=24h
SECURE_COOKIES=true

# Hyperledger Fabric
FABRIC_CA_URL=http://localhost:7054
FABRIC_CHANNEL_NAME=dims-sr-channel
FABRIC_CHAINCODE_NAME=sim-registry

# Security
CORS_ORIGIN=https://localhost:3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# TLS/SSL
SSL_CERT_PATH=./certs/server.crt
SSL_KEY_PATH=./certs/server.key
```

## Database Schema

### Users Table
- User authentication and profile information
- Password hashing, MFA settings
- Account status and timestamps

### Sessions Table
- Active session management
- IP and User-Agent tracking
- Session expiration

### Audit Logs Table
- Complete action history
- Resource tracking
- Security event logging

### Blockchain Events Table
- Off-chain blockchain event storage
- Transaction status tracking
- Event confirmation

### Failed Login Attempts
- Brute force attack detection
- Security monitoring

## Hyperledger Fabric Integration

### Smart Contracts Rules
1. **5 SIM Limit**: Maximum 5 active SIMs per CNIC enforced at contract level
2. **Age Verification**: Must be 18+ years old
3. **CNIC Validity**: Valid format and government database verification
4. **Event Logging**: All transactions logged on immutable ledger

### Chaincode Functions
- `registerSIM()` - Register new SIM with validations
- `deactivateSIM()` - Deactivate active SIM
- `getSIMsByCNIC()` - Retrieve all SIMs for user
- `getActiveSIMCount()` - Check current active SIMs
- `getTransactionHistory()` - Get audit trail

## Security Best Practices

1. **Never commit `.env`** - Add to `.gitignore`
2. **Rotate secrets regularly** - Update JWT and session secrets
3. **Use strong passwords** - Enforce 12+ characters with complexity
4. **Monitor audit logs** - Regular security audit reviews
5. **Keep dependencies updated** - Regular npm audit and updates
6. **Use production certificates** - Replace self-signed certs
7. **Enable HTTPS** - Always use TLS in production
8. **Implement rate limiting** - Prevent abuse
9. **Regular backups** - Database and blockchain nodes
10. **Security headers** - HSTS, CSP, X-Frame-Options

## Logging

All operations are logged to:
- Console (development)
- Audit logs database table
- Blockchain immutable ledger
- API activity logs

## Error Handling

API returns appropriate HTTP status codes:
- `400` - Bad request / validation error
- `401` - Unauthorized / authentication failed
- `403` - Forbidden / MFA required
- `409` - Conflict / resource already exists
- `429` - Too many requests / rate limited
- `500` - Internal server error

## Testing

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Security tests
npm run test:security
```

## Troubleshooting

### Database Connection Error
- Verify PostgreSQL is running
- Check connection string in `.env`
- Ensure user has correct permissions

### Certificate Error
- Regenerate certificates: `./scripts/generate-certs.sh`
- Check certificate paths in `.env`

### Hyperledger Connection Error
- Verify Fabric network is running
- Check FABRIC_CA_URL and channel configuration
- Review fabric logs

## Production Deployment

1. Use proper SSL/TLS certificates from Certificate Authority
2. Set secure environment variables
3. Enable HTTPS only
4. Configure database with backups
5. Setup monitoring and alerting
6. Implement rate limiting per endpoint
7. Enable audit logging and monitoring
8. Regular security audits and penetration testing

## Support

For issues and questions, refer to:
- [Express.js Documentation](https://expressjs.com/)
- [Hyperledger Fabric Documentation](https://hyperledger-fabric.readthedocs.io/)
- [OWASP Security Guidelines](https://owasp.org/)

## License

Private - DIMS-SR Project
