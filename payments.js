// payments.js — persistent ledger of verified x402 payments
const fs = require('fs');
const path = require('path');

const LEDGER = path.join(__dirname, 'payments.json');

function load() {
  try { return JSON.parse(fs.readFileSync(LEDGER, 'utf8')); } catch { return []; }
}

function record(auth, payer, endpoint) {
  const all = load();
  const entry = {
    time: new Date().toISOString(),
    payer,
    from: auth.from,
    value: auth.value, // USDC 6-decimals as string
    valueUsdc: (Number(BigInt(auth.value)) / 1e6).toFixed(2),
    nonce: auth.nonce,
    endpoint
  };
  all.push(entry);
  try { fs.writeFileSync(LEDGER, JSON.stringify(all, null, 2)); } catch (e) { console.error('ledger write failed:', e.message); }
  return entry;
}

function summary() {
  const all = load();
  return {
    count: all.length,
    totalUsdc: all.reduce((s, p) => s + Number(p.valueUsdc), 0).toFixed(2),
    uniquePayers: new Set(all.map(p => p.payer)).size,
    first: all[0]?.time || null,
    last: all[all.length - 1]?.time || null
  };
}

module.exports = { load, record, summary, LEDGER };
