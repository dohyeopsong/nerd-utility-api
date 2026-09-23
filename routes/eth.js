// /eth — Ethereum address validation + EIP-55 mixed-case checksum
const { keccak256 } = require('js-sha3');

function toChecksumAddress(addr) {
  const lower = addr.toLowerCase();
  const hash = keccak256(lower.slice(2)); // hash the hex STRING (ASCII bytes), not decoded bytes
  let out = '0x';
  for (let i = 0; i < 40; i++) {
    const nibble = parseInt(hash[i], 16);
    const ch = lower[2 + i];
    out += nibble >= 8 ? ch.toUpperCase() : ch;
  }
  return out;
}

function validateEth(raw) {
  const addr = (raw || '').trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) {
    return { valid: false, error: 'address must be 0x + 40 hex characters' };
  }
  const checksummed = toChecksumAddress(addr);
  const isChecksummedForm = /[A-F]/.test(addr.slice(2));
  const checksumValid = !isChecksummedForm || addr === checksummed;
  return {
    address: addr,
    valid: true,
    checksumAddress: checksummed,
    allLower: addr === addr.toLowerCase(),
    checksumValid
  };
}

function routeEth(u, res, json) {
  const p = u.searchParams;
  const addr = p.get('address') || p.get('addr') || p.get('a');
  if (!addr) return json(res, 400, { error: 'provide ?address=0x...' });

  const r = validateEth(addr);
  if (!r.valid) return json(res, 400, r);
  return json(res, 200, r);
}

module.exports = { routeEth, toChecksumAddress, validateEth };
