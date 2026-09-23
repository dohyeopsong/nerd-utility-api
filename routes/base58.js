// /base58 — Base58 / Base58Check encode-decode (Bitcoin alphabet)
const crypto = require('crypto');
const ALPHA = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function b58encode(bytes) {
  if (bytes.length === 0) return '';
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) zeros++;
  const size = Math.ceil((bytes.length - zeros) * 138 / 100) + 1;
  const b = new Uint8Array(size);
  let length = 0;
  for (let i = zeros; i < bytes.length; i++) {
    let carry = bytes[i];
    let j = 0;
    for (let k = size - 1; (carry !== 0 || j < length) && k >= 0; k--, j++) {
      carry += 256 * b[k];
      b[k] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    length = j;
  }
  let it = size - length;
  while (it < size && b[it] === 0) it++;
  return '1'.repeat(zeros) + Array.from(b.slice(it), x => ALPHA[x]).join('');
}

function b58decode(s) {
  if (!/^[1-9A-HJ-NP-Za-km-z]*$/.test(s)) return null;
  const zeros = [...s].take ? 0 : (s.match(/^1*/) || [''])[0].length;
  const size = Math.floor(s.length * 733 / 1000) + 1;
  const b = new Uint8Array(size);
  let length = 0;
  for (const ch of s) {
    let carry = ALPHA.indexOf(ch);
    if (carry < 0) return null;
    let j = 0;
    for (let k = size - 1; (carry !== 0 || j < length) && k >= 0; k--, j++) {
      carry += 58 * b[k];
      b[k] = carry % 256;
      carry = Math.floor(carry / 256);
    }
    length = j;
  }
  let it = size - length;
  while (it < size && b[it] === 0) it++;
  return new Uint8Array([...new Array(zeros).fill(0), ...b.slice(it)]);
}

function toHex(u8) { return Buffer.from(u8).toString('hex'); }
function fromHex(hex) { return new Uint8Array(Buffer.from(hex, 'hex')); }

function routeBase58(u, res, json) {
  const p = u.searchParams;
  const q = p.get('q');
  if (!q) return json(res, 400, { error: 'provide ?q=hello or ?decode=<b58>&hex=1' });
  const mode = p.get('mode') || 'encode';
  try {
    if (mode === 'decode') {
      const bytes = b58decode(q);
      if (!bytes) return json(res, 400, { error: 'invalid base58 input' });
      const result = { decoded: Buffer.from(bytes).toString('utf8'), hex: toHex(bytes) };
      if (p.get('check') === '1' && bytes.length >= 5) {
        const payload = bytes.slice(0, -4), sum = bytes.slice(-4);
        const h = crypto.createHash('sha256').update(crypto.createHash('sha256').update(payload).digest()).digest();
        result.checksumValid = h.slice(0, 4).toString('hex') === Buffer.from(sum).toString('hex');
        result.payloadHex = toHex(payload);
      }
      return json(res, 200, result);
    }
    // encode
    const bytes = p.get('hex') === '1' ? fromHex(q) : new Uint8Array(Buffer.from(q, 'utf8'));
    const result = { encoded: b58encode(bytes) };
    if (p.get('check') === '1') {
      const h = crypto.createHash('sha256').update(crypto.createHash('sha256').update(bytes).digest()).digest();
      result.base58Check = b58encode(new Uint8Array([...bytes, ...h.slice(0, 4)]));
    }
    return json(res, 200, result);
  } catch (e) {
    return json(res, 400, { error: e.message });
  }
}

module.exports = { routeBase58, b58encode, b58decode };
