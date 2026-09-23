// /base58 — Bitcoin base58 encode/decode + BTC address validation
const crypto = require('crypto');

const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function b58encode(buf) {
  let n = BigInt('0x' + buf.toString('hex') || '0');
  if (buf.length === 0) return '';
  let out = '';
  while (n > 0n) { out = ALPHABET[Number(n % 58n)] + out; n /= 58n; }
  // leading zero bytes -> '1'
  for (const b of buf) { if (b === 0) out = '1' + out; else break; }
  return out;
}

function b58decode(s) {
  if (!/^[1-9A-HJ-NP-Za-km-z]+$/.test(s)) throw new Error('invalid base58 character');
  let n = 0n;
  for (const c of s) {
    const idx = ALPHABET.indexOf(c);
    if (idx < 0) throw new Error('invalid base58 character: ' + c);
    n = n * 58n + BigInt(idx);
  }
  let hex = n.toString(16);
  if (hex.length % 2) hex = '0' + hex;
  let buf = Buffer.from(hex, 'hex');
  // leading '1's -> zero bytes
  let zeros = 0;
  for (const c of s) { if (c === '1') zeros++; else break; }
  return Buffer.concat([Buffer.alloc(zeros), buf]);
}

function sha256(buf) { return crypto.createHash('sha256').update(buf).digest(); }

function validateBtcAddress(addr) {
  // bech32 (segwit): bc1... / tb1...
  if (/^(bc|tb)1[a-z0-9]{25,62}$/i.test(addr)) return { type: 'segwit (bech32)', network: addr.slice(0, 2) === 'bc' ? 'mainnet' : 'testnet' };
  // base58check (legacy)
  try {
    const decoded = b58decode(addr);
    if (decoded.length !== 25) return { valid: false, error: 'invalid length' };
    const version = decoded[0];
    const payload = decoded.slice(0, -4);
    const checksum = decoded.slice(-4);
    const expected = sha256(sha256(payload)).slice(0, 4);
    if (!expected.equals(checksum)) return { valid: false, error: 'checksum mismatch (typo?)' };
    if (version === 0x00) return { valid: true, type: 'P2PKH', network: 'mainnet' };
    if (version === 0x05) return { valid: true, type: 'P2SH', network: 'mainnet' };
    if (version === 0x6f) return { valid: true, type: 'P2PKH', network: 'testnet' };
    if (version === 0xc4) return { valid: true, type: 'P2SH', network: 'testnet' };
    return { valid: true, type: 'unknown version ' + version, network: 'unknown' };
  } catch (e) {
    return { valid: false, error: e.message };
  }
}

function routeBase58(u, res, json) {
  const p = u.searchParams;
  if (p.get('btc')) {
    return json(res, 200, { address: p.get('btc'), ...validateBtcAddress(p.get('btc')) });
  }
  if (p.get('text') !== null) {
    return json(res, 200, { input: p.get('text'), encoded: b58encode(Buffer.from(p.get('text'), 'utf8')) });
  }
  if (p.get('encode') !== null) {
    return json(res, 200, { input: p.get('encode'), encoded: b58encode(Buffer.from(p.get('encode'), 'utf8')) });
  }
  if (p.get('decode')) {
    try {
      const buf = b58decode(p.get('decode'));
      return json(res, 200, { input: p.get('decode'), decoded: buf.toString('utf8'), hex: buf.toString('hex') });
    } catch (e) { return json(res, 400, { error: e.message }); }
  }
  return json(res, 400, { error: 'provide ?encode=, ?decode=, ?text=, or ?btc=<address>' });
}

module.exports = { routeBase58, b58encode, b58decode, validateBtcAddress };
