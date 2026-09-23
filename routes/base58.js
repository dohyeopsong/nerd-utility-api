// /base58 — Base58 encode/decode + Bitcoin address validation (base58check + bech32 per BIP-173/350)
const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const crypto = require('crypto');
const sha256 = (b) => crypto.createHash('sha256').update(b).digest();

function b58encode(buf) {
  if (!buf.length) return '';
  const digits = [0];
  for (const byte of buf) {
    let carry = byte;
    for (let i = 0; i < digits.length; i++) { carry += digits[i] << 8; digits[i] = carry % 58; carry = (carry / 58) | 0; }
    while (carry) { digits.push(carry % 58); carry = (carry / 58) | 0; }
  }
  let out = '';
  for (const d of digits) out = ALPHABET[d] + out;
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
    for (let i = 0; i < bytes.length; i++) { carry += bytes[i] * 58; bytes[i] = carry & 0xFF; carry >>= 8; }
    while (carry) { bytes.push(carry & 0xFF); carry >>= 8; }
  }
  let zi = 0;
  while (zi < s.length && s[zi] === '1') zi++;
  // bytes is little-endian digit list; reverse and prepend zeros
  const res = Buffer.alloc(zi + bytes.length);
  res.fill(0, 0, zi);
  for (let i = 0; i < bytes.length; i++) res[zi + i] = bytes[bytes.length - 1 - i];
  return res;
}

// ---- bech32 (BIP-173 / BIP-350) ----
const BECH32_CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
function bech32Polymod(values) {
  let chk = 1;
  for (const v of values) {
    const b = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) if ((b >> i) & 1) chk ^= GEN[i];
  }
  return chk;
}
function hrpExpand(hrp) {
  const r = [];
  for (const c of hrp) r.push(c.charCodeAt(0) >>> 5);
  r.push(0);
  for (const c of hrp) r.push(c.charCodeAt(0) & 31);
  return r;
}
function bech32Verify(hrp, dataChars) {
  // dataChars: array of 5-bit values INCLUDING the 6-char checksum
  const values = hrpExpand(hrp).concat(dataChars);
  const mod = bech32Polymod(values);
  return mod === 1 || mod === 0x2bc830a3; // bech32 or bech32m
}
function convertBits(data, fromBits, toBits, pad) {
  let acc = 0, bits = 0;
  const ret = [];
  const maxv = (1 << toBits) - 1;
  for (const v of data) {
    if (v < 0 || (v >> fromBits) !== 0) return null;
    acc = (acc << fromBits) | v;
    bits += fromBits;
    while (bits >= toBits) { bits -= toBits; ret.push((acc >> bits) & maxv); }
  }
  if (pad) { if (bits) ret.push((acc << (toBits - bits)) & maxv); }
  else if (bits >= fromBits || ((acc << (toBits - bits)) & maxv)) return null;
  return ret;
}

const { bech32, bech32m } = require('bech32');
function validateSegwit(addr) {
  try {
    // bech32 package expects data part after the separator; decode handles hrp+data
    const lower = addr.toLowerCase() === addr || addr.toUpperCase() === addr ? addr : addr;
    let dec;
    try { dec = bech32.decode(addr, 90); var enc = 'bech32'; }
    catch (e1) { try { dec = bech32m.decode(addr, 90); enc = 'bech32m'; } catch (e2) { return { valid: false, reason: 'decode failed: ' + (e2.message || e1.message) }; } }
    const hrp = dec.prefix;
    if (hrp !== 'bc' && hrp !== 'tb') return { valid: false, reason: 'unknown hrp ' + hrp };
    const version = dec.words[0];
    const program = bech32.fromWords(dec.words.slice(1));
    if (version > 16) return { valid: false, reason: 'witness version out of range' };
    if (version === 0 && program.length !== 20 && program.length !== 32) return { valid: false, reason: 'v0 program must be 20 or 32 bytes' };
    if (version === 0 && enc !== 'bech32') return { valid: false, reason: 'v0 must use bech32' };
    if (version !== 0 && enc !== 'bech32m') return { valid: false, reason: 'v1+ must use bech32m' };
    return { valid: true, network: hrp === 'bc' ? 'mainnet' : 'testnet', encoding: enc, witnessVersion: version, programLength: program.length, addressType: version === 0 ? (program.length === 20 ? 'P2WPKH' : 'P2WSH') : 'P2TR (taproot)' };
  } catch (e) { return { valid: false, reason: e.message }; }
}

function validateBtc(addr) {
  if (/^(bc|tb)1/.test(addr)) return Object.assign({ type: 'segwit' }, validateSegwit(addr));
  let raw;
  try { raw = b58decode(addr); } catch (e) { return { type: 'base58', valid: false, reason: e.message }; }
  if (raw.length < 5) return { type: 'base58', valid: false, reason: 'too short' };
  const payload = raw.subarray(0, raw.length - 4);
  const checksum = raw.subarray(raw.length - 4);
  if (!checksum.equals(sha256(sha256(payload)).subarray(0, 4))) return { type: 'base58', valid: false, reason: 'bad base58check checksum' };
  const names = { 0x00: 'P2PKH', 0x05: 'P2SH', 0x6f: 'P2PKH (testnet)', 0xc4: 'P2SH (testnet)' };
  return { type: 'base58', valid: true, version: payload[0], addressType: names[payload[0]] || 'unknown version', payloadLength: payload.length - 1 };
}

function routeBase58(u, res, json) {
  const btc = u.searchParams.get('btc') || u.searchParams.get('address');
  if (btc) return json(res, 200, Object.assign({ input: btc }, validateBtc(btc.trim())));

  const encode = u.searchParams.get('encode');
  const decode = u.searchParams.get('decode');
  const text = encode !== null ? encode : decode !== null ? decode : u.searchParams.get('text');
  if (text === null) return json(res, 400, { error: 'missing ?encode=, ?decode=, ?text=, or ?btc=<address>' });

  if (encode !== null) {
    try { return json(res, 200, { input: text, encoded: b58encode(Buffer.from(text, 'utf8')) }); }
    catch (e) { return json(res, 400, { error: e.message }); }
  }
  if (decode !== null || text) {
    try {
      const buf = b58decode(text.trim());
      const utf8 = buf.toString('utf8');
      const printable = /^[\x09\x0a\x0d\x20-\x7e]*$/.test(utf8);
      return json(res, 200, { input: text, decoded: printable ? utf8 : null, hex: buf.toString('hex'), bytes: buf.length });
    } catch (e) { return json(res, 400, { error: e.message }); }
  }
}
module.exports = { routeBase58, b58encode, b58decode, validateBtc };
