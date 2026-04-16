#!/bin/bash

# PostgreSQL Database Setup Script for DIMS-SR

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}[*] DIMS-SR Database Setup${NC}"

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '#' | xargs)
else
  echo -e "${YELLOW}[!] .env file not found. Using default values.${NC}"
  DB_HOST="localhost"
  DB_PORT="5432"
  DB_USER="dims_user"
  DB_PASSWORD="secure_password_here"
  DB_NAME="dims_sr_db"
fi

# Check if PostgreSQL is running
echo -e "${BLUE}[*] Checking PostgreSQL connection...${NC}"
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U postgres -c "SELECT 1" > /dev/null 2>&1; then
  echo -e "${YELLOW}[!] PostgreSQL not running. Please start PostgreSQL first.${NC}"
  exit 1
fi
echo -e "${GREEN}[✓] PostgreSQL is running${NC}"

# Create user if doesn't exist
echo -e "${BLUE}[*] Creating database user...${NC}"
psql -h "$DB_HOST" -p "$DB_PORT" -U postgres -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || true

# Create database if doesn't exist
echo -e "${BLUE}[*] Creating database...${NC}"
psql -h "$DB_HOST" -p "$DB_PORT" -U postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || true

# Grant privileges
echo -e "${BLUE}[*] Granting privileges...${NC}"
psql -h "$DB_HOST" -p "$DB_PORT" -U postgres << EOF
GRANT CONNECT ON DATABASE $DB_NAME TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO $DB_USER;
EOF

# Run migrations
echo -e "${BLUE}[*] Running migrations...${NC}"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f ./migrations/001_init.sql

echo -e "${GREEN}[✓] Database setup completed successfully!${NC}"
echo -e "${BLUE}[*] Database: $DB_NAME${NC}"
echo -e "${BLUE}[*] User: $DB_USER${NC}"
