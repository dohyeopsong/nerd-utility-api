/**
 * Payment-gated endpoints using REAL x402 (EIP-3009) verification.
 * Note: this only verifies the signed intent. Actual settlement requires an
 * on-chain USDC contract call (transferWithAuthorization) once on-chain mode
 * is enabled. Until then, /verify reports what WOULD be paid.
 */
const { verifyPayment } = require('./x402-verify');

const PRICE_CENTS = 5; // $0.05 per batch in USDC (6 decimals)
const MY_ADDRESS = '0x85fe24c7668577ae04106Be4fb806915a77384e0';
const USDC_WEI = String(PRICE_CENTS * 10000); // cents -> 6-dec units

function x402Challenge() {
  return {
    error: 'x402 payment required',
    'x402-version': 1,
    accepts: [{
      scheme: 'exact',
      network: 'base',
      maxAmountRequired: USDC_WEI,
      asset: process.env.USDC_ADDRESS || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      resource: process.env.PUBLIC_URL || 'http://localhost:8080',
      payTo: [MY_ADDRESS],
      description: 'Utility API batch processing (format/csv2json), $' + (PRICE_CENTS / 100).toFixed(2),
      mimeType: 'application/json',
    }],
  };
}

function handlePaidRequest(req, res, processFn) {
  const auth = req.headers['x-payment'] || req.headers['x-payment-payload'];
  if (!auth) {
    // honest 402: no verification without payment
    res.writeHead(402, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(x402Challenge()));
  }
  let payload;
  try { payload = JSON.parse(auth); } catch (e) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'invalid x-payment payload' }));
  }
  const v = verifyPayment(payload, MY_ADDRESS, USDC_WEI);
  if (!v.ok) {
    res.writeHead(402, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'payment rejected: ' + v.error, ...x402Challenge() }));
  }
  processFn(req, res, v);
}

module.exports = { handlePaidRequest, x402Challenge, USDC_WEI, PRICE_CENTS };
