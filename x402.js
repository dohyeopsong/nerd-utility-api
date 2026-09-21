// x402 payment rail: EIP-3009 (transferWithAuthorization) off-chain verification
const { verifyTypedData, Wallet } = require('ethers');

const PAYEE = '0x85fe24c7668577ae04106Be4fb806915a77384e0';
const PRICE_CENTS = 5; // price per paid call

// USDC (Base mainnet) EIP-712 domain for EIP-3009
const DOMAIN = {
  name: 'USD Coin',
  version: '2',
  chainId: 8453,
  verifyingContract: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
};

const TRANSFER_WITH_AUTH_TYPE = [
  { name: 'from', type: 'address' },
  { name: 'to', type: 'address' },
  { name: 'value', type: 'uint256' },
  { name: 'validAfter', type: 'uint256' },
  { name: 'validBefore', type: 'uint256' },
  { name: 'nonce', type: 'bytes32' }
];

// seen nonces → prevent replay
const seenNonces = new Set();

function centsToWei6(c) { return BigInt(c) * 1000000n; }

// Build the 402 challenge response
function challenge(path) {
  return {
    error: 'X-PAYMENT required',
    x402: {
      version: 1,
      payee: PAYEE,
      network: 'base-mainnet',
      asset: 'USDC',
      amount: `${PRICE_CENTS}.00`,
      eip3009: {
        domain: DOMAIN,
        types: { TransferWithAuthorization: TRANSFER_WITH_AUTH_TYPE },
        message: {
          from: '<your-wallet>',
          to: PAYEE,
          value: String(centsToWei6(PRICE_CENTS)),
          validAfter: 0,
          validBefore: '<future-timestamp>',
          nonce: '<random-bytes32>'
        }
      },
      instructions: 'Sign the TransferWithAuthorization typed data with your wallet key, then retry the request with header "X-PAYMENT: <JSON {transfer, authorization: {from,to,value,validAfter,validBefore,nonce}, signature}>"',
      endpoint: path
    }
  };
}

// Verify a client-supplied X-PAYMENT blob. Returns payer address or throws.
function verifyPayment(blob, minValidBefore) {
  let p;
  try { p = JSON.parse(blob); } catch { throw new Error('X-PAYMENT must be JSON'); }
  const { authorization: auth, signature } = p || {};
  if (!auth || !signature) throw new Error('missing authorization/signature');
  if ((auth.to || '').toLowerCase() !== PAYEE) throw new Error('wrong payee');
  if (BigInt(auth.value || '0') < centsToWei6(PRICE_CENTS)) throw new Error('insufficient amount');
  const now = Math.floor(Date.now() / 1000);
  if (Number(auth.validBefore) < now) throw new Error('authorization expired');
  if (Number(auth.validAfter) > now) throw new Error('authorization not yet valid');
  if (!auth.nonce || seenNonces.has(auth.nonce)) throw new Error('nonce reused or missing');
  const recovered = verifyTypedData(DOMAIN, { TransferWithAuthorization: TRANSFER_WITH_AUTH_TYPE }, auth, signature);
  if (!recovered || (auth.from && recovered.toLowerCase() !== auth.from.toLowerCase())) throw new Error('signature mismatch');
  seenNonces.add(auth.nonce);
  return recovered;
}

module.exports = { PAYEE, PRICE_CENTS, centsToWei6, challenge, verifyPayment, DOMAIN, TRANSFER_WITH_AUTH_TYPE };
