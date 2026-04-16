#!/bin/bash

# SSL/TLS Certificate Generation Script for DIMS-SR
# For production, use proper certificates from a Certificate Authority

set -e

# Create certs directory if it doesn't exist
mkdir -p ./certs

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}[*] Generating SSL/TLS certificates for DIMS-SR${NC}"

# Generate private key (2048-bit RSA)
echo -e "${BLUE}[*] Generating private key...${NC}"
openssl genrsa -out ./certs/server.key 2048

# Generate Certificate Signing Request (CSR)
echo -e "${BLUE}[*] Generating certificate signing request...${NC}"
openssl req -new \
  -key ./certs/server.key \
  -out ./certs/server.csr \
  -subj "/C=PK/ST=Pakistan/L=Islamabad/O=DIMS-SR/CN=localhost"

# Generate self-signed certificate (valid for 365 days)
# For production, use a proper CA
echo -e "${BLUE}[*] Generating self-signed certificate...${NC}"
openssl x509 -req \
  -days 365 \
  -in ./certs/server.csr \
  -signkey ./certs/server.key \
  -out ./certs/server.crt \
  -extfile <(printf "subjectAltName=DNS:localhost,DNS:*.dims-sr.local,IP:127.0.0.1")

# Set proper permissions
chmod 600 ./certs/server.key
chmod 644 ./certs/server.crt

# Clean up CSR
rm ./certs/server.csr

echo -e "${GREEN}[✓] Certificates generated successfully!${NC}"
echo -e "${BLUE}[*] Certificates located at: ./certs/${NC}"
echo -e "${BLUE}[*] server.key - Private key (keep secure!)${NC}"
echo -e "${BLUE}[*] server.crt - Public certificate${NC}"
echo ""
echo -e "${BLUE}[!] WARNING: For production, use proper certificates from a trusted CA${NC}"
echo -e "${BLUE}[!] Self-signed certificates are for development only${NC}"
