// /hash — compute digests, optionally compare against expected value
const crypto = require('crypto');
const ALGOS = ['md5', 'sha1', 'sha256', 'sha512'];
const CRC32_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (const b of buf) c = CRC32_TABLE[(c ^ b) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function routeHash(u, res, json) {
  const q = u.searchParams;
  const text = q.get('text') || q.get('input') || '';
  const algo = (q.get('algo') || q.get('hash') || 'sha256').toLowerCase().replace('-', '');
  const expected = q.get('expected');
  const buf = Buffer.from(text, 'utf8');
  const out = {};
  if (algo === 'all') {
    for (const a of ALGOS) out[a] = crypto.createHash(a).update(buf).digest('hex');
    out.crc32 = crc32(buf).toString(16).padStart(8, '0');
  } else if (ALGOS.includes(algo)) {
    out[algo] = crypto.createHash(algo).update(buf).digest('hex');
  } else if (algo === 'crc32') {
    out.crc32 = crc32(buf).toString(16).padStart(8, '0');
  } else {
    return json(res, 400, { error: 'unknown algo; use md5, sha1, sha256, sha512, crc32, or all' });
  }
  if (expected !== null) {
    const exp = expected.toLowerCase().replace(/[\s:-]/g, '');
    const got = Object.values(out).join('');
    // match against any of the computed values
    let match = false, matched = null;
    for (const [k, v] of Object.entries(out)) if (v.replace(/^0x/, '') === exp.replace(/^0x/, '')) { match = true; matched = k; }
    out.expected = expected;
    out.match = match;
    if (match) out.matched_algo = matched;
  }
  return json(res, 200, out);
}
module.exports = { routeHash };
