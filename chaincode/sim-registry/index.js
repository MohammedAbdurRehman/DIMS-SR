'use strict';

const { Contract } = require('fabric-contract-api');
const crypto = require('crypto');

class SIMRegistryContract extends Contract {
  /**
   * Initialize the ledger with empty data
   */
  async initLedger(ctx) {
    console.info('============= START : Initialize Ledger ===========');
    console.info('============= END : Initialize Ledger ===========');
  }

  /**
   * Register a new SIM
   * Enforces business rules: 5 SIM limit per CNIC, age validation, CNIC validity
   */
  async registerSIM(ctx, cnic, fullName, fatherName, dateOfBirth, simNumber, operator) {
    console.info('============= START : Register SIM ===========');

    // Validate age (must be 18 or older)
    const dob = new Date(dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      throw new Error('User must be 18 years or older');
    }

    if (age < 18) {
      throw new Error('User must be 18 years or older');
    }

    // Validate CNIC format (Pakistani CNIC: XXXXX-XXXXXXX-X)
    const cnicRegex = /^\d{5}-\d{7}-\d{1}$/;
    if (!cnicRegex.test(cnic)) {
      throw new Error('Invalid CNIC format. Expected: XXXXX-XXXXXXX-X');
    }

    // Check if CNIC already has 5 SIMs
    const activeSIMsKey = `activeSIMs_${cnic}`;
    const activeSIMsData = await ctx.stub.getState(activeSIMsKey);
    let activeSIMs = [];

    if (activeSIMsData && activeSIMsData.length > 0) {
      activeSIMs = JSON.parse(activeSIMsData.toString());
    }

    if (activeSIMs.length >= 5) {
      throw new Error('Maximum 5 SIMs allowed per CNIC. Please deactivate an existing SIM first.');
    }

    // Create unique SIM record
    const simId = `SIM_${cnic}_${crypto.randomBytes(8).toString('hex')}`;
    const timestamp = new Date().toISOString();

    const simRecord = {
      simId,
      cnic,
      fullName,
      fatherName,
      dateOfBirth,
      simNumber,
      operator,
      status: 'active',
      registrationDate: timestamp,
      lastModified: timestamp,
      transactionId: crypto.randomBytes(16).toString('hex'),
      trackingNumber: crypto.randomBytes(12).toString('hex').toUpperCase(),
    };

    // Store SIM record
    await ctx.stub.putState(simId, Buffer.from(JSON.stringify(simRecord)));

    // Update active SIMs count for CNIC
    activeSIMs.push({
      simId,
      simNumber,
      status: 'active',
      registrationDate: timestamp,
    });

    await ctx.stub.putState(activeSIMsKey, Buffer.from(JSON.stringify(activeSIMs)));

    // Emit event for off-chain logging
    ctx.stub.setEvent('SIMRegistered', Buffer.from(JSON.stringify({
      simId,
      cnic,
      simNumber,
      operator,
      timestamp,
    })));

    console.info('============= END : Register SIM ===========');
    return JSON.stringify(simRecord);
  }

  /**
   * Deactivate a SIM
   */
  async deactivateSIM(ctx, cnic, simId) {
    console.info('============= START : Deactivate SIM ===========');

    // Get SIM record
    const simData = await ctx.stub.getState(simId);
    if (!simData || simData.length === 0) {
      throw new Error(`SIM with ID ${simId} not found`);
    }

    const sim = JSON.parse(simData.toString());

    // Verify CNIC matches
    if (sim.cnic !== cnic) {
      throw new Error('CNIC does not match SIM record');
    }

    // Update status
    sim.status = 'inactive';
    sim.lastModified = new Date().toISOString();

    await ctx.stub.putState(simId, Buffer.from(JSON.stringify(sim)));

    // Update active SIMs list
    const activeSIMsKey = `activeSIMs_${cnic}`;
    const activeSIMsData = await ctx.stub.getState(activeSIMsKey);
    let activeSIMs = [];

    if (activeSIMsData && activeSIMsData.length > 0) {
      activeSIMs = JSON.parse(activeSIMsData.toString());
    }

    // Remove from active list
    activeSIMs = activeSIMs.filter(s => s.simId !== simId);
    await ctx.stub.putState(activeSIMsKey, Buffer.from(JSON.stringify(activeSIMs)));

    // Emit event
    ctx.stub.setEvent('SIMDeactivated', Buffer.from(JSON.stringify({
      simId,
      cnic,
      timestamp: new Date().toISOString(),
    })));

    console.info('============= END : Deactivate SIM ===========');
    return JSON.stringify(sim);
  }

  /**
   * Get all SIMs for a CNIC
   */
  async getSIMsByCSNIC(ctx, cnic) {
    console.info('============= START : Get SIMs by CNIC ===========');

    const iterator = await ctx.stub.getStateByPartialCompositeKey('SIM', [cnic]);

    const allResults = [];
    let result = await iterator.next();

    while (!result.done) {
      const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
      let record;
      try {
        record = JSON.parse(strValue);
      } catch (err) {
        console.log(err);
        record = strValue;
      }
      allResults.push(record);
      result = await iterator.next();
    }

    iterator.close();
    console.info('============= END : Get SIMs by CNIC ===========');
    return JSON.stringify(allResults);
  }

  /**
   * Get SIM details by ID
   */
  async getSIMDetails(ctx, simId) {
    console.info('============= START : Get SIM Details ===========');

    const simData = await ctx.stub.getState(simId);
    if (!simData || simData.length === 0) {
      throw new Error(`SIM with ID ${simId} not found`);
    }

    console.info('============= END : Get SIM Details ===========');
    return simData.toString();
  }

  /**
   * Get active SIM count for a CNIC
   */
  async getActiveSIMCount(ctx, cnic) {
    console.info('============= START : Get Active SIM Count ===========');

    const activeSIMsKey = `activeSIMs_${cnic}`;
    const activeSIMsData = await ctx.stub.getState(activeSIMsKey);

    let count = 0;
    if (activeSIMsData && activeSIMsData.length > 0) {
      const activeSIMs = JSON.parse(activeSIMsData.toString());
      count = activeSIMs.length;
    }

    console.info('============= END : Get Active SIM Count ===========');
    return JSON.stringify({ cnic, activeSIMCount: count, canRegisterMore: count < 5 });
  }

  /**
   * Get transaction history for a SIM
   */
  async getTransactionHistory(ctx, simId) {
    console.info('============= START : Get Transaction History ===========');

    const iterator = await ctx.stub.getHistoryForKey(simId);

    const allResults = [];
    let result = await iterator.next();

    while (!result.done) {
      const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
      let txRecord;
      try {
        txRecord = JSON.parse(strValue);
      } catch (err) {
        txRecord = strValue;
      }

      allResults.push({
        value: txRecord,
        timestamp: result.value.timestamp,
      });

      result = await iterator.next();
    }

    iterator.close();
    console.info('============= END : Get Transaction History ===========');
    return JSON.stringify(allResults);
  }

  /**
   * Verify CNIC validity (integration point with government database)
   * For now, validates format only
   */
  async verifyCNIC(ctx, cnic) {
    console.info('============= START : Verify CNIC ===========');

    const cnicRegex = /^\d{5}-\d{7}-\d{1}$/;
    const isValid = cnicRegex.test(cnic);

    console.info('============= END : Verify CNIC ===========');
    return JSON.stringify({
      cnic,
      isValid,
      message: isValid ? 'CNIC format is valid' : 'Invalid CNIC format',
    });
  }

  /**
   * Immutable audit record (off-chain Firestore remains source of truth for SIM data).
   * payloadJson: JSON string of { action, cnic, transactionId, ... }
   */
  async recordAudit(ctx, payloadJson) {
    if (!payloadJson || typeof payloadJson !== 'string') {
      throw new Error('recordAudit requires a JSON string payload');
    }
    let parsed;
    try {
      parsed = JSON.parse(payloadJson);
    } catch (e) {
      throw new Error('Invalid JSON payload for recordAudit');
    }
    const txId = ctx.stub.getTxID();
    const key = `AUDIT_${txId}`;
    const record = {
      ...parsed,
      fabricTxId: txId,
      committedAt: new Date().toISOString(),
    };
    await ctx.stub.putState(key, Buffer.from(JSON.stringify(record)));
    ctx.stub.setEvent(
      'AuditRecorded',
      Buffer.from(JSON.stringify({ fabricTxId: txId, action: parsed.action || 'unknown' }))
    );
    return JSON.stringify({ key, fabricTxId: txId });
  }
}

module.exports = SIMRegistryContract;
