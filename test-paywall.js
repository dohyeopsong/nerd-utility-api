// End-to-end paywall test: random wallet signs a valid EIP-3009 TransferWithAuthorization,
// submits it as X-PAYMENT to /scrape, expects 200 (paid) vs 402 (challenge/reject).
const { Wallet } = require('ethers');
const DOMAIN = require('./x402.js').DOMAIN;
const TYPES = { TransferWithAuthorization: require('./x402.js').TRANSFER_WITH_AUTH_TYPE };
const { PRICE_CENTS } = require('./x402.js');

const BASE = 'http://localhost:8080';
const ok = (name, cond) => { console.log((cond ? 'PASS' : 'FAIL') + ' ' + name); if (!cond) process.exitCode = 1; };

(async () => {
  const payer = Wallet.createRandom();

  // 1. No payment → 402 with challenge
  let r = await fetch(BASE + '/scrape?url=https://example.com');
  const body = await r.json();
  ok('no-payment 402', r.status === 402 && body.x402 && body.x402.eip3009);
  const challengeNonce = body.x402.eip3009.message.nonce;

  // 2. Valid signed payment → 200
  const auth = {
    from: payer.address,
    to: '0x85fe24c7668577ae04106Be4fb806915a77384e0',
    value: String(BigInt(PRICE_CENTS) * 1000000n),
    validAfter: 0,
    validBefore: Math.floor(Date.now() / 1000) + 3600,
    nonce: '0x' + [...require('crypto').randomBytes(32)].map(b => b.toString(16).padStart(2, '0')).join('')
  };
  const signature = await payer.signTypedData(DOMAIN, TYPES, auth);
  r = await fetch(BASE + '/scrape?url=https://example.com', {
    headers: { 'X-PAYMENT': JSON.stringify({ transfer: { ...auth }, authorization: auth, signature }) }
  });
  const paid = await r.json();
  ok('valid-payment 200', r.status === 200 && paid.title === 'Example Domain');

  // 3. Same nonce replay → 402
  r = await fetch(BASE + '/scrape?url=https://example.com', {
    headers: { 'X-PAYMENT': JSON.stringify({ authorization: auth, signature }) }
  });
  ok('nonce-replay rejected', r.status === 402);

  // 4. Wrong-signer signature → 402
  const imposter = Wallet.createRandom();
  const badSig = await imposter.signTypedData(DOMAIN, TYPES, auth);
  r = await fetch(BASE + '/scrape?url=https://example.com', {
    headers: { 'X-PAYMENT': JSON.stringify({ authorization: { ...auth, nonce: '0x' + 'ab'.repeat(32) }, signature: badSig }) }
  });
  ok('wrong-signer rejected', r.status === 402);
})();
