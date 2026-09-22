// /ip — IPv4 utilities: CIDR info, subnet math, range expansion
function ip2int(ip) {
  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some(o => !Number.isInteger(o) || o < 0 || o > 255)) return null;
  return ((p[0] << 24) | (p[1] << 16) | (p[2] << 8) | p[3]) >>> 0;
}
function int2ip(n) { return [(n >>> 24), (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.'); }
function routeIp(u, res, json) {
  const q = u.searchParams;
  const mode = (q.get('mode') || 'info').toLowerCase();
  if (mode === 'info' || mode === 'cidr') {
    const cidr = q.get('cidr');
    if (!cidr) return json(res, 400, { error: 'cidr required, e.g. 10.0.0.0/24' });
    const m = cidr.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(?:\/(\d{1,2}))?$/);
    if (!m) return json(res, 400, { error: 'invalid CIDR' });
    const base = ip2int(m[1]);
    if (base === null) return json(res, 400, { error: 'invalid IP' });
    const bits = m[2] !== undefined ? +m[2] : 32;
    if (bits < 0 || bits > 32) return json(res, 400, { error: 'invalid prefix (0-32)' });
    const mask = bits === 0 ? 0 : (0xFFFFFFFF << (32 - bits)) >>> 0;
    const network = (base & mask) >>> 0;
    const broadcast = (network | (~mask >>> 0)) >>> 0;
    const usable = bits >= 31 ? (bits === 32 ? 1 : 2) : Math.pow(2, 32 - bits) - 2;
    return json(res, 200, {
      cidr: `${int2ip(network)}/${bits}`,
      network: int2ip(network),
      broadcast: int2ip(broadcast),
      first_host: bits <= 30 ? int2ip(network + 1) : int2ip(network),
      last_host: bits <= 30 ? int2ip(broadcast - 1) : int2ip(broadcast),
      usable_hosts: usable,
      subnet_mask: int2ip(mask),
      wildcard_mask: int2ip(~mask >>> 0),
      total_addresses: Math.pow(2, 32 - bits),
      prefix: bits,
      private: isPrivate(int2ip(network)),
      class: ipClass(network >>> 24)
    });
  }
  if (mode === 'contains') {
    const cidr = q.get('cidr'), ip = q.get('ip');
    if (!cidr || !ip) return json(res, 400, { error: 'cidr and ip required' });
    const m = cidr.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\/(\d{1,2})$/);
    const target = ip2int(ip);
    if (!m || target === null) return json(res, 400, { error: 'invalid cidr or ip' });
    const bits = +m[2];
    const mask = bits === 0 ? 0 : (0xFFFFFFFF << (32 - bits)) >>> 0;
    return json(res, 200, { cidr, ip, contains: ((target & mask) >>> 0) === ((ip2int(m[1]) & mask) >>> 0) });
  }
  if (mode === 'subnets') {
    const cidr = q.get('cidr'), n = +(q.get('n') || q.get('count') || 2);
    if (!cidr) return json(res, 400, { error: 'cidr required' });
    const m = cidr.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\/(\d{1,2})$/);
    if (!m) return json(res, 400, { error: 'invalid CIDR' });
    const base = ip2int(m[1]), bits = +m[2];
    const needed = Math.ceil(Math.log2(n)) || 1;
    if (bits + needed > 32) return json(res, 400, { error: `cannot split /${bits} into ${n} subnets` });
    const newBits = bits + needed;
    const size = Math.pow(2, 32 - newBits);
    const out = [];
    for (let i = 0; i < Math.pow(2, needed); i++) {
      const net = (base & (0xFFFFFFFF << (32 - bits)) >>> 0) + i * size;
      out.push(`${int2ip(net >>> 0)}/${newBits}`);
    }
    return json(res, 200, { cidr, subnets: out, new_prefix: newBits });
  }
  return json(res, 400, { error: 'mode must be info|contains|subnets' });
}
function isPrivate(ip) {
  const p = ip.split('.').map(Number);
  return p[0] === 10 || (p[0] === 172 && p[1] >= 16 && p[1] <= 31) || (p[0] === 192 && p[1] === 168) || p[0] === 127;
}
function ipClass(o) { return o < 128 ? 'A' : o < 192 ? 'B' : o < 224 ? 'C' : o < 240 ? 'D' : 'E'; }
module.exports = { routeIp };
