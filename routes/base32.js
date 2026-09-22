// routes/base32.js — RFC 4648 Base32 encode/decode
// GET /base32?encode=hello  |  GET /base32?decode=NBSWY3DP
const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function routeBase32(u, res, json) {
  const q = u.searchParams;
  const enc = q.get('encode'), dec = q.get('decode');
  if (!enc && !dec) return json(res, 400, { error: 'provide encode=<text> or decode=<base32>' });
  if (enc !== null) {
    const buf = Buffer.from(enc, 'utf8');
    let out = '';
    for (let i = 0; i < buf.length; i += 5) {
      const b = buf.subarray(i, i + 5);
      let bits = '';
      for (const x of b) bits += x.toString(2).padStart(8, '0');
      while (bits.length % 5) bits += '0';
      for (let j = 0; j < bits.length; j += 5) out += A[parseInt(bits.slice(j, j + 5), 2)];
    }
    const padTo = Math.ceil(buf.length / 5) * 8;
    out += '='.repeat(Math.max(0, padTo - out.length));
    return json(res, 200, { input: enc, encoded: out, inputBytes: buf.length });
  }
  const clean = dec.replace(/=+$/, '').toUpperCase().replace(/\s+/g, '');
  if (!/^[A-Z2-7]*$/.test(clean)) return json(res, 400, { error: 'invalid base32 characters' });
  if (clean.length % 8 !== 0 && dec.includes('=')) return json(res, 400, { error: 'invalid padding' });
  let bits = '';
  for (const ch of clean) bits += A.indexOf(ch).toString(2).padStart(5, '0');
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  const buf = Buffer.from(bytes);
  return json(res, 200, {
    input: dec, decoded: buf.toString('utf8'), decodedHex: buf.toString('hex'), bytes: buf.length,
    padded: dec.includes('=')
  });
}
module.exports = { routeBase32 };
