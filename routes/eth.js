// /eth — Ethereum address validation + EIP-55 checksum encoding
const crypto = require('crypto');
const { keccak256 } = (() => {
  try { return require('js-sha3') ? { keccak256: require('js-sha3').keccak256 } : {}; } catch { return {}; }
})();

function keccakHex(input) {
  // use js-sha3 if available, else fail
  if (keccak256) return keccak256(input);
  throw new Error('keccak unavailable');
}

function toChecksumAddress(addr) {
  const a = addr.toLowerCase().replace(/^0x/, '');
  const hash = keccakHex(a);
  let out = '0x';
  for (let i = 0; i < a.length; i++) {
    const c = a[i];
    if (c >= '0' && c <= '9') out += c;
    else {
      const nibble = parseInt(hash[i], 16);
      out += nibble >= 8 ? c.toUpperCase() : c;
    }
  }
  return out;
}

function validateEth(addr) {
  const r = { address: addr };
  if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) { r.valid = false; r.error = 'invalid format (expected 0x + 40 hex chars)'; return r; }
  r.valid = true;
  const allLower = addr === addr.toLowerCase();
  const allUpper = addr.slice(2) === addr.slice(2).toUpperCase();
  if (allLower || allUpper) {
    r.checksum = 'unchecked (all lower/upper case)';
  } else {
    const expected = toChecksumAddress(addr);
    r.checksumValid = expected === addr;
    r.checksumAddress = expected;
    if (!r.checksumValid) r.warning = 'EIP-55 checksum mismatch';
  }
  return r;
}

function routeEth(u, res, json) {
  const q = u.searchParams.get('a') || u.searchParams.get('addr');
  if (!q) return json(res, 400, { error: 'provide ?a=0x...' });
  try {
    const r = validateEth(q.trim());
    return json(res, 200, r);
  } catch (e) {
    return json(res, 500, { error: e.message });
  }
}

module.exports = { routeEth, toChecksumAddress, validateEth };
