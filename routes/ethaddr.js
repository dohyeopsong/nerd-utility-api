// /ethaddr — validate Ethereum address, EIP-55 mixed-case checksum verification
const { keccak256 } = require('js-sha3');
function toChecksum(addrHexLower) {
  const h = keccak256(addrHexLower);
  let s = '';
  for (let i = 0; i < 40; i++) s += parseInt(h[i], 16) >= 8 ? addrHexLower[i].toUpperCase() : addrHexLower[i];
  return '0x' + s;
}
function routeEthaddr(u, res, json) {
  const p = u.searchParams;
  const addr = p.get('addr') || p.get('address');
  if (!addr) return json(res, 200, { usage: '?addr=0x... — validate format and EIP-55 checksum' });
  const a = addr.trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(a)) return json(res, 422, { error: 'Invalid address: must be 0x + 40 hex characters', input: a });
  const lower = a.toLowerCase();
  const cs = toChecksum(lower.slice(2));
  const out = {
    input: a,
    valid: true,
    checksummed: cs,
    all_lower: a === lower,
    all_upper: a === '0x' + lower.slice(2).toUpperCase(),
    has_checksum: a !== lower && a !== '0x' + lower.slice(2).toUpperCase(),
  };
  if (out.has_checksum) out.checksum_valid = a === cs;
  return json(res, 200, out);
}
module.exports = { routeEthaddr, toChecksum };
