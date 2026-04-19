# Hyperledger Fabric — production deployment (DIMS-SR)

The Node API writes **immutable audit records** to chaincode function `recordAudit` on channel `mychannel` (configurable). Firestore remains the operational database for SIMs and orders.

## What you need

1. A running Fabric network (TLS, orderer, peer(s), channel, chaincode installed and **committed**).
2. A **connection profile** JSON (Common Connection Profile) for your client org.
3. A **client identity** (X.509 cert + private key) permitted to invoke chaincode on that channel.
4. Backend environment variables (see `backend/.env.example`).

The fastest supported path for development and demos is **Hyperledger Fabric Samples — test-network**:

```bash
git clone https://github.com/hyperledger/fabric-samples.git
cd fabric-samples/test-network
./network.sh down
./network.sh up createChannel -c mychannel -ca
```

Enroll an application user (or use the admin identity the samples export), then **install and approve** the chaincode from this repo’s `chaincode/sim-registry` directory using the Fabric **peer lifecycle** commands (see Fabric docs: “Deploying a smart contract to a channel”).

### Chaincode contract

- Package name / label: set `FABRIC_CHAINCODE_NAME` to match what you deploy (default in code: `simregistry`).
- Required transaction: **`recordAudit(string payloadJson)`** — already implemented in `chaincode/sim-registry/index.js`.

After deployment, test invoke:

```bash
peer chaincode invoke -C mychannel -n simregistry -c '{"function":"recordAudit","Args":["{\"action\":\"ping\"}"]}'
```

(Adjust `-n` / channel to match your deployment.)

## Backend environment

| Variable | Purpose |
|----------|---------|
| `FABRIC_ENABLED` | Set to `false` only for environments **without** a ledger (local UI work). Omit or `true` for production. |
| `FABRIC_CONNECTION_PROFILE_PATH` | Absolute path to connection profile JSON. |
| `FABRIC_USER_CREDENTIALS_DIR` | MSP folder for the client user (`signcerts/cert.pem`, `keystore/*`). |
| `FABRIC_IDENTITY_LABEL` | Wallet label (default `appUser`). |
| `FABRIC_MSP_ID` | MSP ID (default `Org1MSP`). |
| `FABRIC_CHANNEL_NAME` | Channel (default `mychannel`). |
| `FABRIC_CHAINCODE_NAME` | Installed chaincode name (default `simregistry`). |
| `FABRIC_DISCOVERY_AS_LOCALHOST` | Set `true` when using test-network on the same machine as the peer advertises localhost. |

Alternatively set **`FABRIC_WALLET_PATH`** to a filesystem wallet exported by Fabric samples instead of `FABRIC_USER_CREDENTIALS_DIR`.

## NADRA (identity)

**Default (no env):** the backend uses **built-in mock CNIC records** and **mock fingerprint success** in `backend/utils/nadra-service.js` so signup and SIM flows work without running a separate service.

**Optional:** set `NADRA_API_BASE_URL=http://<host>:<port>` to use an HTTP adapter that implements:

- `POST /verify-user` — body `{ cnic, name?, fatherName?, dateOfBirth? }` → `{ success, verified, message, user? }`
- `POST /verify-fingerprint` — body `{ cnic, fingerprintImages: string[] }` → `{ success, verified, message, ... }`
- `GET /citizen/:cnic` — returns citizen JSON for authenticated proxy routes.

You can run the included **standalone adapter** (`backend/nadra-mock-server.js`) as its own process on port 4000 and point `NADRA_API_BASE_URL` at it. That process may scrape/cache third-party pages; operation and legality are **your responsibility** in production.

## Docker Compose note

`docker-compose-fabric.yml` in the repo root is a **skeleton** and requires generated genesis blocks, MSP material, and channel artifacts. Unless you maintain those files under `fabric-network/`, prefer **fabric-samples/test-network** and wire the backend to its connection profile and credentials.
