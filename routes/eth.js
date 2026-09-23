// /eth — Ethereum address validation: format, EIP-55 mixed-case checksum, chain detection
// EIP-55: keccak256 of lowercase hex address (without 0x), uppercase-hex the nibble where hash nibble >= 8
const { keccak256 } = require('js-sha3');

function toChecksumAddress(addr) {
  const lower = addr.toLowerCase().replace(/^0x/, '');
  const hash = keccak256(lower);
  let out = '0x';
  for (let i = 0; i < 40; i++) {
    const nibble = parseInt(hash[i], 16);
    out += nibble >= 8 ? lower[i].toUpperCase() : lower[i];
  }
  return out;
}

function validateEth(raw) {
  const addr = raw.trim();
  const out = { input: addr, valid: false };
  if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) {
    out.reason = 'must be 0x + 40 hex characters';
    return out;
  }
  const hasUpper = /[A-F]/.test(addr);
  const hasLower = /[a-f]/.test(addr);
  if (hasUpper && hasLower) {
    // mixed case: must match EIP-55 checksum exactly
    const checksummed = toChecksumAddress(addr);
    out.checksum = addr === checksummed;
    if (!out.checksum) {
      out.reason = 'EIP-55 checksum mismatch';
      out.expected = checksummed;
      return out;
    }
    out.valid = true;
    out.checksummed = checksummed;
    out.checksumFormat = 'EIP-55';
  } else {
    // all lowercase or all uppercase: format valid, checksum not asserted
    out.valid = true;
    out.checksummed = toChecksumAddress(addr);
    out.checksumFormat = 'not asserted (all-' + (hasLower ? 'lower' : 'upper') + 'case input)';
  }
  // well-known prefixes (no guarantee, informational)
  out.hex = addr.toLowerCase();
  return out;
}

function routeEth(u, res, json) {
  const addr = u.searchParams.get('addr') || u.searchParams.get('a') || u.searchParams.get('q');
  if (!addr) return json(res, 400, { error: 'missing ?addr=0x...' });
  // checksum conversion mode
  if (u.searchParams.get('mode') === 'checksum') {
    const v = validateEth(addr);
    if (!/^0x[0-9a-fA-F]{40}$/.test(addr.trim())) return json(res, 400, { error: v.reason || 'invalid format' });
    return json(res, 200, { input: addr, checksummed: toChecksumAddress(addr) });
  }
  return json(res, 200, validateEth(addr));
}

module.exports = { routeEth, validateEth, toChecksumAddress };
