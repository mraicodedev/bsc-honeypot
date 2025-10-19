const HoneypotDetector = require('./detector');
const { DEX_CONFIG, BSC_CONFIG, RISK_THRESHOLDS } = require('./config');

/**
 * Quick check function for simple usage
 */
async function checkHoneypot(tokenAddress, rpcUrl) {
  const detector = new HoneypotDetector(rpcUrl);
  return await detector.checkToken(tokenAddress);
}

/**
 * Check multiple tokens at once
 */
async function checkMultipleTokens(tokenAddresses, rpcUrl) {
  const detector = new HoneypotDetector(rpcUrl);
  const promises = tokenAddresses.map(address => detector.checkToken(address));
  return await Promise.all(promises);
}

module.exports = {
  HoneypotDetector,
  checkHoneypot,
  checkMultipleTokens,
  config: {
    DEX_CONFIG,
    BSC_CONFIG,
    RISK_THRESHOLDS
  }
};