// /number — parse, format, and convert numbers between bases
function routeNumber(u, res, json) {
  const q = Object.fromEntries(u.searchParams.entries());
  const raw = (q.n || q.value || '').trim();
  if (!raw) throw new Error('provide ?n=<number>');
  if (raw.length > 100) throw new Error('input too long');

  // allow 0x/0b/0o prefixes, underscores, commas
  let n;
  try {
    n = Number(raw.replace(/[_,]/g, '').replace(/^0x/i, '').replace(/^0b/i, '').replace(/^0o/i, ''));
  } catch { n = NaN; }
  if (!Number.isFinite(n)) throw new Error('not a finite number: ' + raw);

  const intPart = BigInt(Math.round(Math.abs(n))) * (n < 0 ? -1n : 1n);
  const out = {
    input: raw, value: n, type: Number.isInteger(n) ? 'integer' : 'float',
    hex: intPart.toString(16), hex0x: '0x' + intPart.toString(16),
    binary: intPart.toString(2), octal: intPart.toString(8),
    base36: (n < 0n ? '-' : '') + intPart.toString(36),
    exponential: n.toExponential(6),
    fixed2: n.toFixed(2),
    rounded: Math.round(n),
    ceil: Math.ceil(n), floor: Math.floor(n),
    abs: Math.abs(n), sign: Math.sign(n),
    sqrt: Math.sqrt(n), squared: n * n, cubed: n ** 3,
    isPrime: Number.isInteger(n) && n > 1 && ![2,3].includes(n) ? primeTest(BigInt(n)) : (n === 2 || n === 3),
    factors: n > 0 && Number.isInteger(n) && n <= 1e12 ? primeFactors(BigInt(n)) : null
  };
  return json(res, 200, out);
}

function primeTest(n) {
  if (n < 2n) return false;
  for (let i = 2n; i * i <= n && i < 100000n; i++) if (n % i === 0n) return false;
  return true;
}
function primeFactors(n) {
  const f = [];
  let x = n;
  for (let i = 2n; i * i <= x && i < 100000n; i++) while (x % i === 0n) { f.push(i.toString()); x /= i; }
  if (x > 1n) f.push(x.toString());
  return f;
}

module.exports = { routeNumber };
