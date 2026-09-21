// Nerd Micro-Service — utility API with real x402 (EIP-3009) payment gating
// Endpoints: /format (paid), /csv2json (paid), /health, /pricing (free)
const http = require('http');
const url = require('url');
const utils = require('./utils');
const { handlePaidRequest, x402Challenge, USDC_WEI, PRICE_CENTS } = require('./pay-gate');

const PORT = process.env.PORT || 8080;
const MY_ADDRESS = '0x85fe24c7668577ae04106Be4fb806915a77384e0';

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => { if (data.length > 5e6) req.destroy(); data += c; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

const PRICING = {
  currency: 'USDC',
  chain: 'base',
  payment: 'x402 (EIP-3009 TransferWithAuthorization, signature required)',
  endpoints: {
    '/format': { price: '$' + (PRICE_CENTS / 100).toFixed(2) + '/call', desc: 'Pretty-print or minify JSON' },
    '/csv2json': { price: '$' + (PRICE_CENTS / 100).toFixed(2) + '/call', desc: 'Convert CSV text to JSON array' },
    '/health': { price: 'free', desc: 'Service status' },
    '/pricing': { price: 'free', desc: 'This pricing sheet' }
  },
  how_to_pay: 'POST with header "x-payment": JSON payload {signature, from, to, value, validAfter, validBefore, nonce} — an EIP-3009 TransferWithAuthorization signed for ' + USDC_WEI + ' units (6 decimals) to ' + MY_ADDRESS + ' on Base. Without payment, endpoints return 402.',
  pay_to: MY_ADDRESS
};

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const route = parsed.pathname.replace(/\/+$/, '') || '/';

  try {
    if (route === '/health') return json(res, 200, { status: 'ok', uptime: process.uptime(), paid_api: true });

    if (route === '/pricing') return json(res, 200, PRICING);

    if (route === '/format' || route === '/csv2json') {
      if (req.method !== 'POST') return json(res, 405, { error: 'POST only. See /docs' });
      const body = await readBody(req);
      return handlePaidRequest(req, res, (req2, res2, v) => {
        let out;
        if (route === '/format') {
          out = utils.formatJSON(body);
        } else {
          out = utils.csv2json(body);
        }
        if (out.error) return json(res2, 400, out);
        json(res2, 200, { paid_by: v.payer, result: out });
      });
    }

    return json(res, 404, { error: 'unknown endpoint', pricing: '/pricing' });
  } catch (e) {
    console.error("500:", e); json(res, 500, { error: "internal error" });
  }
});

server.listen(PORT, () => {
  console.log(`Nerd utility API listening on :${PORT} with x402 pay gate`);
});
