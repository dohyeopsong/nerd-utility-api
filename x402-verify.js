/**
 * Real x402 payment verification via EIP-3009 (TransferWithAuthorization)
 * for USDC on Base. Verifies an actual EIP-712 signature, not header trust.
 */
const { Wallet, verifyTypedData, solidityPackedKeccak256 } = require('ethers');

// USDC (FiatTokenV2_2) on Base mainnet
const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const DOMAIN = {
  name: 'USD Coin',
  version: '2',
  chainId: 8453,
  verifyingContract: USDC_BASE,
};
const TYPES = {
  TransferWithAuthorization: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' },
  ],
};

// Simple in-memory used-nonce store (survives process lifetime)
const usedNonces = new Set();

/**
 * Verify a signed TransferWithAuthorization message.
 * body: { signature, from, to, value, validAfter, validBefore, nonce }
 */
function verifyPayment(body, expectedTo, expectedValue) {
  const errors = [];
  try {
    if (!body || typeof body !== 'object') return { ok: false, error: 'missing body' };

    const { signature, from, to, value, validAfter, validBefore, nonce } = body;
    for (const k of ['signature', 'from', 'to', 'value', 'validAfter', 'validBefore', 'nonce']) {
      if (body[k] === undefined) errors.push(`missing ${k}`);
    }
    if (errors.length) return { ok: false, error: errors.join(', ') };

    const now = Math.floor(Date.now() / 1000);
    if (BigInt(validBefore) < BigInt(now)) return { ok: false, error: 'payment expired' };
    if (BigInt(validAfter) > BigInt(now)) return { ok: false, error: 'payment not yet valid' };
    if (usedNonces.has(nonce)) return { ok: false, error: 'nonce replayed' };
    if (expectedTo && to.toLowerCase() !== expectedTo.toLowerCase())
      return { ok: false, error: 'wrong recipient' };
    if (expectedValue && BigInt(value) < BigInt(expectedValue))
      return { ok: false, error: 'insufficient amount' };

    const recovered = verifyTypedData(DOMAIN, TYPES, {
      from, to, value, validAfter, validBefore, nonce,
    }, signature);
    if (recovered.toLowerCase() !== from.toLowerCase())
      return { ok: false, error: 'signature does not match payer' };

    usedNonces.add(nonce);
    return { ok: true, payer: recovered, value: value.toString() };
  } catch (e) {
    return { ok: false, error: 'verification failed: ' + e.message };
  }
}

module.exports = { verifyPayment, USDC_BASE, DOMAIN, TYPES };
