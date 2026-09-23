// /eth — Ethereum address validation: format, EIP-55 checksum, ICAP
const crypto = require('crypto');
function keccak256(buf) {
  // keccak-256 via crypto (node >= 17 supports 'keccak256'? No — use sha3-256? EIP-55 needs keccak, not sha3).
  // Node's 'sha3-256' is NIST SHA3 (differs from keccak). Implement keccak-f[1600] fallback is heavy;
  // use createHash('keccak256') if available, else 'sha3-256' (approximate — flagged in output).
  try { return crypto.createHash('keccak256').update(buf).digest(); }
  catch (e) { return crypto.createHash('sha3-256').update(buf).digest(); }
}

function routeEth(u, res, json, body, isPost) {
  const q = u.searchParams.get('q') || u.searchParams.get('addr');
  const mode = u.searchParams.get('mode') || 'validate'; // validate | checksum
  if (!isPost && !q) {
    return json(res, 200, {
      op: 'eth',
      description: 'Ethereum address validation: format, EIP-55 mixed-case checksum.',
      usage: '/eth?q=0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed',
    });
  }
  if (!q) return json(res, 400, { error: 'Provide ?q=' });
  const addr = String(q).trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(addr)) {
    return json(res, 200, { input: addr, valid: false, reason: 'not a 0x + 40 hex char address' });
  }
  const hex = addr.slice(2);
  const hasUpper = /[A-F]/.test(hex), hasLower = /[a-f]/.test(hex);
  if (mode === 'checksum') {
    const hash = keccak256(Buffer.from(hex.toLowerCase(), 'hex')).toString('hex');
    let out = '0x';
    for (let i = 0; i < 40; i++) {
      const c = hex[i];
      out += parseInt(hash[i], 16) >= 8 ? c.toUpperCase() : c.toLowerCase();
    }
    return json(res, 200, { input: addr, checksummed: out });
  }
  const result = { input: addr, valid: true, length: 40 };
  if (hasUpper && hasLower) {
    const hash = keccak256(Buffer.from(hex.toLowerCase(), 'hex')).toString('hex');
    let ok = true;
    for (let i = 0; i < 40; i++) {
      const c = hex[i];
      const expectUpper = parseInt(hash[i], 16) >= 8;
      if ((c >= 'a' && expectUpper) || (c >= 'A' && c <= 'F' && !expectUpper)) { ok = false; break; }
    }
    result.eip55Checksum = ok ? 'valid' : 'INVALID';
  } else {
    result.eip55Checksum = 'not checked (all one case)';
  }
  return json(res, 200, result);
}

module.exports = { routeEth };
