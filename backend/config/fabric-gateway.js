/**
 * Hyperledger Fabric — production submission via fabric-network (Fabric 2.x).
 *
 * When FABRIC_ENABLED is unset on Vercel (VERCEL=1), Fabric is skipped unless you set FABRIC_ENABLED=true.
 *
 * Required when Fabric is enabled (FABRIC_ENABLED not false, and not skipped by VERCEL rule above):
 *   FABRIC_CONNECTION_PROFILE_PATH — path to connection profile JSON (e.g. from test-network)
 *   FABRIC_USER_CREDENTIALS_DIR      — MSP folder for client user (signcerts + keystore)
 *
 * Optional:
 *   FABRIC_IDENTITY_LABEL   (default: appUser)
 *   FABRIC_MSP_ID           (default: Org1MSP)
 *   FABRIC_CHANNEL_NAME     (default: mychannel)
 *   FABRIC_CHAINCODE_NAME   (default: simregistry)
 *   FABRIC_DISCOVERY_AS_LOCALHOST — "true" when peer TLS names are localhost (local test-network)
 */

const fs = require('fs');
const path = require('path');

function fabricExplicitlyDisabled() {
  const v = String(process.env.FABRIC_ENABLED || '').trim().toLowerCase();
  if (v === 'false') return true;
  if (v === 'true') return false;
  // On Vercel/serverless, Fabric is opt-in (avoids loading fabric-network unless configured).
  return process.env.VERCEL === '1';
}

/**
 * Load fabric-network only when Fabric is used. Avoids cold-start crashes on
 * serverless (e.g. Vercel) when FABRIC_ENABLED=false — fabric-common uses dynamic
 * requires that bundlers often omit unless explicitly pulled in.
 */
function loadFabricNetwork() {
  // Static require so @vercel/node file tracing includes fabric-common impl (it is also
  // loaded dynamically from fabric-common/lib/Utils.js and can be omitted from the bundle).
  require('fabric-common/lib/impl/CryptoSuite_ECDSA_AES');
  return require('fabric-network');
}

async function buildWalletFromCredentialsDir(credDir, identityLabel, mspId) {
  const { Wallets } = loadFabricNetwork();
  const wallet = await Wallets.newInMemoryWallet();
  const certPath = path.join(credDir, 'signcerts', 'cert.pem');
  if (!fs.existsSync(certPath)) {
    throw new Error(`Fabric: certificate not found at ${certPath}`);
  }
  const ksDir = path.join(credDir, 'keystore');
  if (!fs.existsSync(ksDir)) {
    throw new Error(`Fabric: keystore not found at ${ksDir}`);
  }
  const keyFiles = fs.readdirSync(ksDir).filter((f) => !f.startsWith('.'));
  if (!keyFiles.length) {
    throw new Error(`Fabric: empty keystore at ${ksDir}`);
  }
  const keyPath = path.join(ksDir, keyFiles[0]);
  const cert = fs.readFileSync(certPath, 'utf8');
  const key = fs.readFileSync(keyPath, 'utf8');
  await wallet.put(identityLabel, {
    credentials: { certificate: cert, privateKey: key },
    mspId,
    type: 'X.509',
  });
  return wallet;
}

async function buildWallet() {
  const { Wallets } = loadFabricNetwork();
  const identityLabel = process.env.FABRIC_IDENTITY_LABEL || 'appUser';
  const mspId = process.env.FABRIC_MSP_ID || 'Org1MSP';
  
  // Check for environment variable certificates first (for Vercel/serverless)
  if (process.env.FABRIC_CERTIFICATE && process.env.FABRIC_PRIVATE_KEY) {
    const wallet = await Wallets.newInMemoryWallet();
    await wallet.put(identityLabel, {
      credentials: { 
        certificate: process.env.FABRIC_CERTIFICATE, 
        privateKey: process.env.FABRIC_PRIVATE_KEY 
      },
      mspId,
      type: 'X.509',
    });
    return wallet;
  }
  
  // Fall back to filesystem wallet
  const walletPath = process.env.FABRIC_WALLET_PATH;
  if (walletPath && fs.existsSync(walletPath)) {
    return await Wallets.newFileSystemWallet(walletPath);
  }
  
  // Fall back to MSP directory structure
  const credDir = process.env.FABRIC_USER_CREDENTIALS_DIR;
  if (!credDir) {
    throw new Error(
      'Fabric: No wallet configuration found. Set FABRIC_CERTIFICATE + FABRIC_PRIVATE_KEY (env vars) or FABRIC_WALLET_PATH (filesystem wallet) or FABRIC_USER_CREDENTIALS_DIR (MSP user folder)'
    );
  }
  return buildWalletFromCredentialsDir(credDir, identityLabel, mspId);
}

/**
 * Submit immutable audit payload to chaincode function recordAudit.
 * @param {Record<string, unknown>} data
 * @returns {Promise<{ fabricTxId?: string; skipped?: boolean }>}
 */
async function submitToBlockchain(data) {
  if (fabricExplicitlyDisabled()) {
    const fe = String(process.env.FABRIC_ENABLED || '').trim().toLowerCase();
    const reason =
      fe === 'false'
        ? 'FABRIC_ENABLED=false'
        : process.env.VERCEL === '1'
          ? 'Vercel default (set FABRIC_ENABLED=true to submit on-chain)'
          : 'Fabric disabled';
    console.warn(`[Fabric] ${reason} — ledger submit skipped`);
    return { skipped: true };
  }

  const { Gateway, Wallets } = loadFabricNetwork();

  const ccpPath = process.env.FABRIC_CONNECTION_PROFILE_PATH;
  let ccp;
  
  if (process.env.FABRIC_CONNECTION_PROFILE) {
    // Load connection profile from environment variable (for Vercel/serverless)
    try {
      ccp = JSON.parse(process.env.FABRIC_CONNECTION_PROFILE);
    } catch (error) {
      throw new Error(`Fabric: Invalid FABRIC_CONNECTION_PROFILE JSON: ${error.message}`);
    }
  } else if (ccpPath && fs.existsSync(ccpPath)) {
    // Load connection profile from file (for local development)
    ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
  } else {
    throw new Error(
      `Fabric: Neither FABRIC_CONNECTION_PROFILE (env var) nor FABRIC_CONNECTION_PROFILE_PATH (${ccpPath || 'unset'}) is available. ` +
        'Set FABRIC_CONNECTION_PROFILE with the connection profile JSON or FABRIC_CONNECTION_PROFILE_PATH to a file path.'
    );
  }
  const channelName = process.env.FABRIC_CHANNEL_NAME || 'mychannel';
  const chaincodeName = process.env.FABRIC_CHAINCODE_NAME || 'simregistry';
  const identityLabel = process.env.FABRIC_IDENTITY_LABEL || 'appUser';
  const asLocalhost = String(process.env.FABRIC_DISCOVERY_AS_LOCALHOST || '').toLowerCase() === 'true';

  const wallet = await buildWallet();
  const gateway = new Gateway();

  try {
    await gateway.connect(ccp, {
      wallet,
      identity: identityLabel,
      discovery: { enabled: false, asLocalhost },
    });
    const network = await gateway.getNetwork(channelName);
    const contract = network.getContract(chaincodeName);
    const payload = JSON.stringify({
      ...data,
      submittedAt: new Date().toISOString(),
    });
    const result = await contract.submitTransaction('recordAudit', payload);
    const out = result?.toString?.() || '';
    let parsed = {};
    try {
      parsed = JSON.parse(out);
    } catch {
      parsed = { raw: out };
    }
    console.info('[Fabric] recordAudit committed:', parsed.fabricTxId || parsed.key || 'ok');
    return { fabricTxId: parsed.fabricTxId || parsed.txId, response: parsed };
  } finally {
    gateway.disconnect();
  }
}

module.exports = { submitToBlockchain };
