// x402-client.js — minimal client for Nerd's x402-gated /scrape endpoint.
// Usage:
//   const { payAndScrape } = require('./x402-client.js');
//   const items = await payAndScrape(privateKey, 'https://example.com');
// Signs an EIP-3009 TransferWithAuthorization (USDC on Base) off-chain.
// Note: signature authorizes the transfer; on-chain settlement is not yet
// executed by the server, so no funds move — this proves payment intent.
const { Wallet } = require('ethers');
const crypto = require('crypto');

const API_BASE = process.env.NERD_API || 'http://localhost:8080';
const PRICE_CENTS = 5;

const DOMAIN = {
  name: 'USD Coin',
  version: '2',
  chainId: 8453,
  verifyingContract: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
};
const TYPES = {
  TransferWithAuthorization: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' }
  ]
};

function toWallet(key) {
  if (key && typeof key === 'object' && typeof key.signTypedData === 'function' && key.address) return key;
  return new Wallet(key);
}

async function payAndCall(privateKey, path, params = {}, method = 'GET', body = null) {
  const wallet = toWallet(privateKey);
  const auth = {
    from: wallet.address,
    to: '0x85fe24c7668577ae04106Be4fb806915a77384e0',
    value: String(BigInt(PRICE_CENTS) * 1000000n),
    validAfter: 0,
    validBefore: Math.floor(Date.now() / 1000) + 3600,
    nonce: '0x' + crypto.randomBytes(32).toString('hex')
  };
  const signature = await wallet.signTypedData(DOMAIN, TYPES, auth);
  const qs = new URLSearchParams(params).toString();
  const url = `${API_BASE}${path}${qs ? '?' + qs : ''}`;
  const res = await fetch(url, {
    method,
    headers: { 'X-PAYMENT': JSON.stringify({ authorization: auth, signature }) },
    body: body ? JSON.stringify(body) : undefined
  });
  if (res.status === 402) {
    const challenge = await res.json();
    throw new Error('payment rejected: ' + JSON.stringify(challenge));
  }
  return res.json();
}

async function payAndScrape(privateKey, url) {
  return payAndCall(privateKey, '/scrape', { url });
}

module.exports = { payAndCall, payAndScrape, DOMAIN, TYPES, API_BASE };
