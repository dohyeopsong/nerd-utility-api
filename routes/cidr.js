// /cidr — IPv4 subnet calculator
function ipToInt(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => !Number.isInteger(p) || p < 0 || p > 255)) return null;
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}
function intToIp(n) {
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
}
function routeCidr(u, res, json) {
  const p = u.searchParams;
  const cidr = (p.get('cidr') || p.get('c') || '').trim();
  if (!cidr) return json(res, 200, { usage: '?cidr=<ip>/<prefix> — e.g. 192.168.1.10/24' });
  const m = cidr.match(/^(\d{1,3}(?:\.\d{1,3}){3})\/(\d{1,2})$/);
  if (!m) { return json(res, 422, { error: 'invalid CIDR: expected <ipv4>/<prefix>, e.g. 192.168.1.10/24' }); }
  const ipInt = ipToInt(m[1]);
  const prefix = Number(m[2]);
  if (ipInt === null || prefix < 0 || prefix > 32) return json(res, 422, { error: 'invalid IP or prefix (0-32)' });
  const maskInt = prefix === 0 ? 0 : (0xFFFFFFFF << (32 - prefix)) >>> 0;
  const netInt = (ipInt & maskInt) >>> 0;
  const bcastInt = (netInt | (~maskInt >>> 0)) >>> 0;
  const total = Math.pow(2, 32 - prefix);
  const usable = prefix >= 31 ? (prefix === 31 ? 2 : 1) : total - 2;
  const out = {
    input: cidr,
    ip: m[1],
    prefix: prefix,
    netmask: intToIp(maskInt),
    wildcard: intToIp(~maskInt >>> 0),
    network: intToIp(netInt),
    broadcast: prefix <= 30 ? intToIp(bcastInt) : null,
    first_host: prefix <= 30 ? intToIp(netInt + 1) : intToIp(netInt),
    last_host: prefix <= 30 ? intToIp(bcastInt - 1) : intToIp(bcastInt),
    total_addresses: total,
    usable_hosts: usable,
    class: (m[1].split('.')[0] < 128 ? 'A' : m[1].split('.')[0] < 192 ? 'B' : m[1].split('.')[0] < 224 ? 'C' : 'D/E'),
    is_private: /^10\./.test(m[1]) || /^192\.168\./.test(m[1]) || /^172\.(1[6-9]|2\d|3[01])\./.test(m[1])
  };
  return json(res, 200, out);
}
module.exports = { routeCidr };
