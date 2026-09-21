// IP subnet calculator: IPv4 CIDR notation → network, broadcast, range, mask, wildcard, usable hosts
function ipToInt(ip) {
  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some(x => isNaN(x) || x < 0 || x > 255)) return null;
  return ((p[0] << 24) | (p[1] << 16) | (p[2] << 8) | p[3]) >>> 0;
}
function intToIp(n) {
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
}
function routeCidr(u, res, json) {
  const cidr = (u.searchParams.get('cidr') || '').trim();
  if (!cidr) return json(res, 400, { error: 'missing cidr param, e.g. ?cidr=192.168.1.10/24' });
  const m = /^(\d{1,3}(?:\.\d{1,3}){3})\/(\d{1,2})$/.exec(cidr);
  if (!m) return json(res, 400, { error: 'invalid CIDR notation' });
  const prefix = +m[2];
  if (prefix > 32) return json(res, 400, { error: 'prefix must be 0-32' });
  const ipInt = ipToInt(m[1]);
  if (ipInt === null) return json(res, 400, { error: 'invalid IPv4 address' });
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const network = (ipInt & mask) >>> 0;
  const broadcast = (network | (~mask >>> 0)) >>> 0;
  const total = Math.pow(2, 32 - prefix);
  const usable = prefix >= 31 ? (prefix === 31 ? 2 : 1) : total - 2;
  return json(res, 200, {
    cidr,
    network: intToIp(network),
    broadcast: intToIp(broadcast),
    firstHost: prefix >= 31 ? intToIp(network) : intToIp(network + 1),
    lastHost: prefix >= 31 ? intToIp(broadcast) : intToIp(broadcast - 1),
    netmask: intToIp(mask),
    wildcard: intToIp(~mask >>> 0),
    prefix, totalAddresses: total, usableHosts: usable,
    ipClass: ipInt >>> 24 >= 224 ? (ipInt >>> 24 >= 240 ? 'reserved (multicast/E)' : 'multicast (D)') : (ipInt >>> 24 < 128 ? 'A' : ipInt >>> 24 < 192 ? 'B' : 'C'),
    isPrivate: (ipInt >>> 24) === 10 || ((ipInt >>> 20) === 0xAC1) || ((ipInt >>> 16) === 0xC0A8)
  });
}
module.exports = { routeCidr };
