// Per-IP token-bucket rate limiter + in-memory abuse caps for /hook and /paste
const buckets = new Map(); // ip -> { tokens, last }
const CAPS = { hook: 50, paste: 100 }; // max stored per IP

function rateLimit(ip, limitPerMin = 60) {
  const now = Date.now();
  let b = buckets.get(ip);
  if (!b) { b = { tokens: limitPerMin, last: now }; buckets.set(ip, b); }
  // refill: 1 token per (60000/limit) ms
  const refill = ((now - b.last) / 60000) * limitPerMin;
  b.tokens = Math.min(limitPerMin, b.tokens + refill);
  b.last = now;
  if (b.tokens < 1) {
    buckets.set(ip, b);
    return { allowed: false, retryAfterSec: Math.ceil((1 - b.tokens) * 60 / limitPerMin) };
  }
  b.tokens -= 1;
  buckets.set(ip, b);
  // periodic cleanup (every ~10k calls)
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (now - v.last > 3600000) buckets.delete(k);
  }
  return { allowed: true, remaining: Math.floor(b.tokens) };
}

// generic counter-based cap for hook/paste stored objects per IP
const counts = new Map(); // ip -> { hook: n, paste: n }
function capCheck(ip, kind) {
  if (!(kind in CAPS)) return true;
  let c = counts.get(ip);
  if (!c) { c = { hook: 0, paste: 0 }; counts.set(ip, c); }
  return c[kind] < CAPS[kind];
}
function capIncr(ip, kind) {
  let c = counts.get(ip) || { hook: 0, paste: 0 };
  c[kind] = (c[kind] || 0) + 1;
  counts.set(ip, c);
}
function capDecr(ip, kind) {
  let c = counts.get(ip);
  if (c && c[kind] > 0) c[kind]--;
}
function capStats() { return { perIPLimits: CAPS, tracked: counts.size }; }

module.exports = { rateLimit, capCheck, capIncr, capDecr, capStats };
