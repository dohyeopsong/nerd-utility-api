// /base58 — Base58 encode/decode + Bitcoin address validation (legacy P2PKH/P2SH, bech32 P2WPKH tag info)
const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function b58encode(buf) {
  if (!buf.length) return '';
  const digits = [0];
  for (const byte of buf) {
    let carry = byte;
    for (let i = 0; i < digits.length; i++) {
      carry += digits[i] << 8;
      digits[i] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry) { digits.push(carry % 58); carry = (carry / 58) | 0; }
  }
  let out = '';
  for (const d of digits) out += ALPHABET[d];
  // leading zero bytes -> '1'
  let zi = 0;
  while (zi < buf.length && buf[zi] === 0) { out = '1' + out; zi++; }
  return out;
}

function b58decode(s) {
  const bytes = [0];
  for (const ch of s) {
    const val = ALPHABET.indexOf(ch);
    if (val < 0) throw new Error('invalid base58 character: ' + ch);
    let carry = val;
    for (let i = 0; i < bytes.length; i++) {
      carry += bytes[i] * 58;
      bytes[i] = carry & 0xFF;
      carry >>= 8;
    }
    while (carry) { bytes.push(carry & 0xFF); carry >>= 8; }
  }
  // leading '1's -> zero bytes
  let zi = 0;
  while (zi < s.length && s[zi] === '1') zi++;
  const out = new Uint8Array(zi + bytes.length - 1);
  out.fill(0, 0, zi);
  for (let i = bytes.length - 1, j = out.length - 1; i >= 0 && j >= zi; i--, j--) out[j] = bytes[i];
  // trim: bytes array grew MSB-first reversed; easier: reconstruct properly
  const res = Buffer.alloc(zi + bytes.length);
  res.fill(0, 0, zi);
  for (let i = 0; i < bytes.length; i++) res[zi + i] = bytes[bytes.length - 1 - i];
  return res;
}

const crypto = require('crypto');
function sha256(b) { return crypto.createHash('sha256').update(b).digest(); }

function validateBtc(addr) {
  // bech32 (bc1...)
  if (addr.startsWith('bc1') || addr.startsWith('tb1')) {
    const hrp = addr.slice(0, 2);
    const data = addr.slice(3).toLowerCase();
    if (!/^[qpzry9x8gf2tvdcw0s3jn54khce6mua7l]+$/.test(data)) return { type: 'bech32', valid: false, reason: 'invalid charset' };
    // checksum verify (bech32)
    const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
    const charset = 'qpzry9x8gf2tvdcw0s3jn54khce6mua7l';
    function bech32Polymod(values) {
      let chk = 1;
      for (const v of values) {
        const b = chk >> 25;
        chk = ((chk & 0x1FFFFFF) << 5) ^ v;
        for (let i = 0; i < 5; i++) if ((b >> i) & 1) chk ^= GEN[i];
      }
      return chk;
    }
    function hrpExpand(h) { const r = []; for (const c of h) r.push(c.charCodeAt(0) >> 5); r.push(0); for (const c of h) r.push(c.charCodeAt(0) & 31); return r; }
    function createChecksum(hrp, data) { const values = hrpExpand(hrp).concat(data).concat([0,0,0,0,0,0]); const mod = bech32Polymod(values) ^ 1; const out = []; for (let i = 0; i < 6; i++) out.push((mod >> 5 * (5 - i)) & 31); return out; }
    const values = hrpExpand(hrp).concat([...data].map(c => charset.indexOf(c)));
    const ret = bech32Polymod(values);
    if (ret !== 1) return { type: 'bech32', valid: false, reason: 'bad bech32 checksum' };
    const wit = data.slice(1, -6); // first char is separator-ish version
    return { type: 'bech32', valid: true, witnessProgramLength: wit.length === 50 ? 32 : (wit.length === 40 ? 20 : wit.length / 2) };
  }
  // base58check
  let raw;
  try { raw = b58decode(addr); } catch (e) { return { type: 'base58', valid: false, reason: e.message }; }
  if (raw.length < 5) return { type: 'base58', valid: false, reason: 'too short' };
  const payload = raw.subarray(0, raw.length - 4);
  const checksum = raw.subarray(raw.length - 4);
  const expect = sha256(sha256(payload)).subarray(0, 4);
  if (!checksum.equals(expect)) return { type: 'base58', valid: false, reason: 'bad base58check checksum' };
  const version = payload[0];
  const names = { 0x00: 'P2PKH', 0x05: 'P2SH', 0x6f: 'P2PKH (testnet)', 0xc4: 'P2SH (testnet)' };
  return { type: 'base58', valid: true, version: version, addressType: names[version] || 'unknown version 0x' + version.toString(16), payloadLength: payload.length - 1 };
}

function routeBase58(u, res, json, body, isPost) {
  const text = (isPost ? (body && (body.text || body.input)) : null) ||
    u.searchParams.get('text') || u.searchParams.get('input') ||
    u.searchParams.get('s') || u.searchParams.get('decode') || u.searchParams.get('encode');
  const mode = u.searchParams.get('mode') || (isPost && body && body.mode) || 'auto';
  const btc = (isPost ? body && body.address : null) || u.searchParams.get('btc') || u.searchParams.get('address');

  if (btc) {
    const r = validateBtc(btc.trim());
    return json(res, 200, Object.assign({ input: btc }, r));
  }

  if (!text) return json(res, 400, { error: 'missing ?text= (or ?encode=/?decode=) or ?btc=<address>' });

  if (mode === 'encode' || /encode=/.test(u.search || '')) {
    try {
      const buf = Buffer.from(text, 'utf8');
      return json(res, 200, { input: text, encoded: b58encode(buf) });
    } catch (e) { return json(res, 400, { error: e.message }); }
  }
  if (mode === 'decode' || /decode=/.test(u.search || '')) {
    try {
      const buf = b58decode(text.trim());
      const utf8 = buf.toString('utf8');
      const printable = /^[\x09\x0a\x0d\x20-\x7e]*$/.test(utf8);
      return json(res, 200, { input: text, decoded: printable ? utf8 : null, hex: buf.toString('hex'), bytes: buf.length });
    } catch (e) { return json(res, 400, { error: e.message }); }
  }
  // auto: try decode, then encode
  try {
    const buf = b58decode(text.trim());
    const utf8 = buf.toString('utf8');
    const printable = /^[\x09\x0a\x0d\x20-\x7e]*$/.test(utf8);
    return json(res, 200, { input: text, direction: 'decoded', decoded: printable ? utf8 : null, hex: buf.toString('hex'), bytes: buf.length });
  } catch (e) {
    const buf = Buffer.from(text, 'utf8');
    return json(res, 200, { input: text, direction: 'encoded', encoded: b58encode(buf) });
  }
}
module.exports = { routeBase58 };
