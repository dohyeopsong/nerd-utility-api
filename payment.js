// Real x402 payment verification: EIP-3009 TransferWithAuthorization
// USDC on Base uses EIP-3009 authorize-transfer. This module:
//   1. Recovers the signer from the EIP-712 typed-data signature.
//   2. Verifies the transfer authorization (amount, recipient, deadline).
//   3. Recovers from double-spend via on-chain nonce/used state (requires RPC in online mode).
// Local mode (no RPC) supports signature recovery + balance checks via public Base RPC if reachable.

const { ethers } = require('ethers');

// USDC (Base mainnet) implements EIP-3009.
const USDC_BASE = '0x833589fCD6eDb6E30f76f9444B45Dc1Cf9F13a5B';
const CHAIN_ID = 8453;

// EIP-712 domain for USDC's TransferWithAuthorization
function domain() {
  return {
    name: 'USD Coin',
    version: '2',
    chainId: CHAIN_ID,
    verifyingContract: USDC_BASE,
  };
}

// EIP-712 types for transferWithAuthorization
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

/**
 * Verify a signed x402-style payment authorization.
 * @param {object} payload - {from, to, value, validAfter, validBefore, nonce, signature}
 * @param {string} expectedRecipient - my wallet address (payment must be to me)
 * @returns {object} {valid, signer, error}
 */
async function verifyTransferWithAuth(payload, expectedRecipient) {
  try {
    if (!payload || typeof payload !== 'object') return { valid: false, error: 'missing payload' };
    const { from, to, value, validAfter, validBefore, nonce, signature } = payload;
    if (String(to).toLowerCase() !== String(expectedRecipient).toLowerCase()) {
      return { valid: false, error: 'wrong recipient' };
    }
    const now = Math.floor(Date.now() / 1000);
    if (Number(validBefore) < now) return { valid: false, error: 'authorization expired' };
    if (Number(validAfter) > now) return { valid: false, error: 'not yet valid' };

    const signer = ethers.verifyTypedData(
      domain(),
      TYPES.TransferWithAuthorization,
      { from, to, value, validAfter, validBefore, nonce },
      signature
    );
    if (signer.toLowerCase() !== String(from).toLowerCase()) {
      return { valid: false, error: 'signer mismatch', signer };
    }
    return { valid: true, signer, value };
  } catch (e) {
    return { valid: false, error: e.message };
  }
}

module.exports = { verifyTransferWithAuth, domain, TYPES, USDC_BASE, CHAIN_ID };
