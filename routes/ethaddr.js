// /ethaddr — Ethereum address validation, EIP-55 checksum, EIP-681 payment URI
const { keccak256 } = require('js-sha3');

function toChecksumAddress(addr) {
  const lower = addr.toLowerCase().replace(/^0x/, '');
  const hash = keccak256(lower);
  let out = '0x';
  for (let i = 0; i < 40; i++) {
    out += parseInt(hash[i], 16) >= 8 ? lower[i].toUpperCase() : lower[i];
  }
  return out;
}

function routeEthaddr(u, res, json) {
  const p = u.searchParams;
  const addr = (p.get('addr') || p.get('a') || '').trim();

  if (!addr) {
    return json(res, 200, { usage: '?addr=0x... (validate + EIP-55 checksum) | add &amount=1.5 (ETH) for EIP-681 payment URI' });
  }

  if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) {
    return json(res, 400, { addr, error: 'invalid format: expected 0x + 40 hex chars' });
  }

  const checksummed = toChecksumAddress(addr);
  const hasChecksum = addr !== addr.toLowerCase() && addr !== addr.toUpperCase();
  const matchesChecksum = addr === checksummed;

  const result = {
    addr,
    checksumAddress: checksummed,
    checksumProvided: hasChecksum,
    checksumValid: hasChecksum ? matchesChecksum : null
  };

  const amount = p.get('amount');
  if (amount && /^\d+(\.\d+)?$/.test(amount)) {
    result.paymentURI = `ethereum:${checksummed}@1?value=${amount}`;
  }

  return json(res, 200, result);
}

module.exports = { routeEthaddr };
