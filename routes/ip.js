// /ip — IPv4 subnet calculator & info
function parseIPv4(s) {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(s);
  if (!m) return null;
  const o = m.slice(1).map(Number);
  if (o.some(x => x > 255)) return null;
  return ((o[0] << 24) | (o[1] << 16) | (o[2] << 8) | o[3]) >>> 0;
}
function intToIp(n) { return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.'); }

function subnetInfo(ip, cidr) {
  if (cidr < 0 || cidr > 32) return { error: 'CIDR must be 0-32' };
  const mask = cidr === 0 ? 0 : (0xFFFFFFFF << (32 - cidr)) >>> 0;
  const network = (ip & mask) >>> 0;
  const broadcast = (network | (~mask >>> 0)) >>> 0;
  const total = Math.pow(2, 32 - cidr);
  const usable = cidr >= 31 ? total : total - 2;
  const first = cidr >= 31 ? network : network + 1;
  const last = cidr >= 31 ? broadcast : broadcast - 1;
  return {
    ip: intToIp(ip), cidr, netmask: intToIp(mask), wildcard: intToIp(~mask >>> 0),
    network: intToIp(network), broadcast: intToIp(broadcast),
    firstHost: intToIp(first), lastHost: intToIp(last),
    totalAddresses: total, usableHosts: usable,
    class: intToIp(ip).split('.')[0] < 128 ? 'A' : intToIp(ip).split('.')[0] < 192 ? 'B' : intToIp(ip).split('.')[0] < 224 ? 'C' : 'D/E',
    isPrivate: /^10\./.test(intToIp(ip)) || /^192\.168\./.test(intToIp(ip)) || /^172\.(1[6-9]|2\d|3[01])\./.test(intToIp(ip))
  };
}

function routeIp(u, res, json) {
  const p = u.searchParams;
  const q = p.get('ip');
  if (!q) return json(res, 400, { error: 'provide ?ip=192.168.1.10[/24]' });
  let ipStr = q, cidr = 24;
  if (q.includes('/')) { const [a, c] = q.split('/'); ipStr = a; cidr = parseInt(c, 10); }
  const ip = parseIPv4(ipStr);
  if (ip === null) return json(res, 400, { error: 'invalid IPv4: ' + ipStr });
  return json(res, 200, subnetInfo(ip, cidr));
}

module.exports = { routeIp, subnetInfo, parseIPv4 };
