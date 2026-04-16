/**
 * Mock blockchain submission for development
 * Replace with actual Hyperledger Fabric implementation
 */
const submitToBlockchain = async (data) => {
  console.log('[MOCK BLOCKCHAIN] Submitting transaction:', data);
  // Simulate async operation
  await new Promise(resolve => setTimeout(resolve, 100));
  return { transactionId: `mock-${Date.now()}`, status: 'success' };
};

module.exports = { submitToBlockchain };
