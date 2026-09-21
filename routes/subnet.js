// /subnet?cidr=192.168.1.10/24 → network, broadcast, mask, wildcard, hosts, class, range
function ipToInt(ip) {
  const parts = ip.split('.');
  if (parts.length !== 4 || parts.some(p => !/^\d{1,3}$/.test(p) || +p > 255)) return null;
  return ((+parts[0] << 24) | (+parts[1] << 16) | (+parts[2] << 8) | +parts[3]) >>> 0;
}
function intToIp(n) {
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
}
function routeSubnet(u, res, json) {
  const cidr = u.searchParams.get('cidr');
  if (!cidr || !cidr.includes('/')) {
    return json(res, 400, { error: 'pass cidr=ip/prefix, e.g. /subnet?cidr=192.168.1.10/24' });
  }
  const [ip, preStr] = cidr.split('/');
  const prefix = parseInt(preStr);
  const ipInt = ipToInt(ip.trim());
  if (ipInt === null) return json(res, 400, { error: 'invalid IPv4 address', example: '192.168.1.10/24' });
  if (isNaN(prefix) || prefix < 0 || prefix > 32) return json(res, 400, { error: 'invalid prefix (0-32)' });

  const maskInt = prefix === 0 ? 0 : (0xFFFFFFFF << (32 - prefix)) >>> 0;
  const network = (ipInt & maskInt) >>> 0;
  const broadcast = (network | (~maskInt >>> 0)) >>> 0;
  const totalHosts = Math.pow(2, 32 - prefix);
  const usable = prefix >= 31 ? (prefix === 31 ? 2 : 1) : totalHosts - 2;
  const firstHost = prefix >= 31 ? network : network + 1;
  const lastHost = prefix >= 31 ? broadcast : broadcast - 1;
  const o1 = (network >>> 24) & 255;
  const isPrivate = (o1 === 10) || (o1 === 172 && (((network >>> 16) & 255) >= 16) && ((network >>> 16) & 255) <= 31) || (o1 === 192 && ((network >>> 16) & 255) === 168);
  const range = prefix >= 31 ? 'point-to-point (RFC 3021)' : 'global unicast';
  const scope = prefix === 32 ? 'single host' : isPrivate ? 'private (RFC 1918)' : range;

  return json(res, 200, {
    cidr: `${intToIp(network)}/${prefix}`,
    ip,
    prefix,
    netmask: intToIp(maskInt),
    wildcard: intToIp(~maskInt >>> 0),
    network: intToIp(network),
    broadcast: intToIp(broadcast),
    firstHost: intToIp(firstHost),
    lastHost: intToIp(lastHost),
    totalAddresses: totalHosts,
    usableHosts: usable,
    scope,
    binaryMask: maskInt.toString(2).padStart(32, '0').replace(/(.{8})(?=.)/g, '$1.')
  });
}
module.exports = { routeSubnet };
