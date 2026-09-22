// routes/base.js — number base conversion
// GET /base?value=255&from=10&to=16 | shorthand ?hex=255 ?dec=0xff ?bin=42
function routeBase(u, res, json) {
  const q = u.searchParams;
  let value = q.get('value'), from = parseInt(q.get('from') || '10', 10), to = parseInt(q.get('to') || '10', 10);
  // shorthand helpers
  if (value === null) {
    if (q.get('hex') !== null) { value = q.get('hex'); from = 10; to = 16; }
    else if (q.get('dec') !== null) { value = q.get('dec'); from = 16; to = 10; }
    else if (q.get('bin') !== null) { value = q.get('bin'); from = 10; to = 2; }
    else if (q.get('b64') !== null) { value = q.get('b64'); from = 10; to = 64; }
    else return json(res, 400, { error: 'provide value+from+to, or shorthand hex/dec/bin/b64' });
  }
  if (![2, 8, 10, 16, 36, 64].includes(from) || ![2, 8, 10, 16, 36, 64].includes(to))
    return json(res, 400, { error: 'from/to must be one of 2,8,10,16,36,64' });
  let n;
  try {
    if (from === 64) { // custom digit set: 0-9A-Za-z-_ in value order
      const D = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';
      n = 0n;
      for (const ch of value) { const i = D.indexOf(ch); if (i < 0) throw new Error('bad digit'); n = n * 64n + BigInt(i); }
    } else {
      if (from !== 10 && !new RegExp('^[-+]?[0-9a-zA-Z]+$','i').test(value)) throw new Error('bad chars');
      n = BigInt(parseInt(value, from));
    }
  } catch (e) { return json(res, 400, { error: `cannot parse '${value}' in base ${from}: ${e.message}` }); }
  const enc = (b, x) => {
    if (b === 10) return x.toString();
    if (b === 64) { const D='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_'; if (x===0n) return '0'; let s=''; while(x>0n){s=D[Number(x%64n)]+s;x/=64n;} return s; }
    let s = x < 0n ? '-' : ''; let v = x < 0n ? -x : x; if (v === 0n) return '0';
    while (v > 0n) { s = '0123456789abcdefghijklmnopqrstuvwxyz'[Number(v % BigInt(b))] + s; v /= BigInt(b); }
    return s;
  };
  const abs = n < 0n ? -n : n;
  return json(res, 200, {
    input: { value, from },
    bin: enc(2, n), oct: enc(8, n), dec: n.toString(), hex: enc(16, n), base36: enc(36, n), base64: enc(64, n),
    requested: { base: to, value: enc(to, n) },
    bits: abs === 0n ? 0 : abs.toString(2).length,
    isPrime: isPrime(abs)
  });
}
function isPrime(n) {
  if (n < 2n) return false;
  for (let i = 2n; i * i <= n; i++) if (n % i === 0n) return false;
  return true;
}
module.exports = { routeBase };
