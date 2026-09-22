// /netmask — IPv4 subnet calculator: CIDR or dotted mask → network, broadcast, range, usable hosts
function ipToInt(ip) {
  const p = ip.split('.');
  if (p.length !== 4) return null;
  const o = p.map(x => (/^\d+$/.test(x) ? +x : NaN));
  if (o.some(x => isNaN(x) || x < 0 || x > 255)) return null;
  return ((o[0] << 24) | (o[1] << 16) | (o[2] << 8) | o[3]) >>> 0;
}
function intToIp(n) {
  return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
}
function maskFromPrefix(p) { return p === 0 ? 0 : (0xFFFFFFFF << (32 - p)) >>> 0; }
function routeNetmask(u, res, json) {
  const q = u.searchParams;
  const ip = q.get('ip') || '';
  const cidr = q.get('cidr') || '';
  const maskParam = q.get('mask') || '';
  if (!ip) return json(res, 400, { error: 'ip required' });
  let prefix = null;
  if (cidr) {
    const m = cidr.match(/^\/?(\d+)$/);
    if (!m || +m[1] < 0 || +m[1] > 32) return json(res, 400, { error: 'invalid cidr: ' + cidr });
    prefix = +m[1];
  } else if (maskParam) {
    const mi = ipToInt(maskParam);
    if (mi === null) return json(res, 400, { error: 'invalid mask: ' + maskParam });
    // mask must be contiguous ones
    const bin = mi.toString(2).padStart(32, '0');
    if (!/^1*0*$/.test(bin)) return json(res, 400, { error: 'invalid mask (non-contiguous): ' + maskParam });
    prefix = bin.replace(/0+$/, '').length;
  } else {
    return json(res, 400, { error: 'cidr or mask required' });
  }
  const ipInt = ipToInt(ip);
  if (ipInt === null) return json(res, 400, { error: 'invalid ip: ' + ip });
  const mask = maskFromPrefix(prefix);
  const network = (ipInt & mask) >>> 0;
  const broadcast = (network | (~mask >>> 0)) >>> 0;
  const total = Math.pow(2, 32 - prefix);
  const usable = prefix >= 31 ? (prefix === 32 ? 1 : 2) : total - 2;
  const first = prefix >= 31 ? network : network + 1;
  const last = prefix >= 31 ? broadcast : broadcast - 1;
  const privateRanges = [[ipToInt('10.0.0.0'), 8], [ipToInt('172.16.0.0'), 12], [ipToInt('192.168.0.0'), 16]];
  const isPrivate = ipInt === ipToInt('127.0.0.1') || (ipInt >>> 24) === 169 && ((ipInt >>> 16) & 255) === 254
    || privateRanges.some(([base, plen]) => ((ipInt & maskFromPrefix(plen)) >>> 0) === base);
  const out = {
    ip, cidr: '/' + prefix, netmask: intToIp(mask),
    wildcard: intToIp((~mask) >>> 0),
    network: intToIp(network), broadcast: intToIp(broadcast),
    first_host: intToIp(first), last_host: intToIp(last),
    total_addresses: total, usable_hosts: usable,
    ip_class: ipInt < ipToInt('128.0.0.0') ? 'A' : ipInt < ipToInt('192.0.0.0') ? 'B' : ipInt < ipToInt('224.0.0.0') ? 'C' : ipInt < ipToInt('240.0.0.0') ? 'D' : 'E',
    is_private_ip: !!isPrivate
  };
  return json(res, 200, out);
}
module.exports = { routeNetmask };
