// One-shot patcher: fix x402.js payee bug + wire payment gate into app.js
const fs = require('fs');
const S = '/Users/dohyeopsong/service/';

// 1) Fix x402.js: payee -> PAYEE
let x = fs.readFileSync(S + 'x402.js', 'utf8');
x = x.replace(/payee:/g, 'payee: PAYEE,').replace(/to: payee,/, 'to: PAYEE,');
x = x.replace(/const PAYEE =/, 'const PAYEE ='); // no-op safety
// any bare `payee` references already covered; ensure no undefined remains
fs.writeFileSync(S + 'x402.js', x);

// 2) Patch app.js: add gate for premium endpoints
let a = fs.readFileSync(S + 'app.js', 'utf8');
if (!a.includes('x402')) {
  const gate = `
// ---- x402 payment gate ----
const { challenge, verifyPayment } = require('./x402');
const PREMIUM = new Set(['/scrape', '/jwt-decode']);
app.use((req, res, next) => {
  if (!PREMIUM.has(req.path)) return next();
  const pay = req.headers['x-payment'];
  if (!pay) return res.status(402).json(challenge(req.path));
  try {
    const payer = verifyPayment(pay);
    res.setHeader('X-PAYMENT-VERIFIED', payer);
    next();
  } catch (e) {
    return res.status(402).json({ error: 'payment verification failed: ' + e.message, x402: challenge(req.path).x402 });
  }
});
// ---- end gate ----
`;
  // insert before first route (first app.post/app.get)
  const m = a.search(/app\.(post|get|use)\(/);
  if (m === -1) throw new Error('no route found in app.js');
  a = a.slice(0, m) + gate + '\n' + a.slice(m);
  fs.writeFileSync(S + 'app.js', a);
  console.log('gate wired');
} else {
  console.log('gate already present');
}
