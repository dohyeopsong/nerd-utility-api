// IP/CIDR subnet calculator: /subnet?cidr=10.0.0.0/8 or ?ip=a.b.c.d&mask=255.0.0.0 or ?range=a.b.c.d,e.f.g.h
function ipToInt(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => !Number.isInteger(p) || p < 0 || p > 255)) throw new Error('invalid IPv4: ' + ip);
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}
const intToIp = n => [(n >>> 24), (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
function maskToPrefix(mask) {
  const n = ipToInt(mask);
  const bin = n.toString(2).padStart(32, '0');
  if (!/^1*0*$/.test(bin)) throw new Error('invalid netmask: ' + mask);
  return (bin.match(/1/g) || []).length;
}
function prefixToMask(p) { return intToIp(p === 0 ? 0 : (0xFFFFFFFF << (32 - p)) >>> 0); }
function calc(cidr) {
  const m = cidr.match(/^(\d+\.\d+\.\d+\.\d+)(?:\/(\d+))?$/);
  if (!m) throw new Error('invalid cidr: ' + cidr);
  const ip = m[1], prefix = m[2] !== undefined ? +m[2] : 32;
  if (prefix < 0 || prefix > 32) throw new Error('prefix must be 0-32');
  const base = ipToInt(ip);
  const mask = prefix === 0 ? 0 : (0xFFFFFFFF << (32 - prefix)) >>> 0;
  const network = (base & mask) >>> 0;
  const broadcast = (network | (~mask >>> 0)) >>> 0;
  const total = Math.pow(2, 32 - prefix);
  const usable = prefix >= 31 ? total : total - 2;
  const first = prefix >= 31 ? network : network + 1;
  const last = prefix >= 31 ? broadcast : broadcast - 1;
  return {
    cidr: intToIp(network) + '/' + prefix,
    network: intToIp(network), broadcast: intToIp(broadcast),
    netmask: prefixToMask(prefix), wildcard: intToIp(~mask >>> 0),
    first_host: prefix >= 31 ? null : intToIp(first), last_host: prefix >= 31 ? null : intToIp(last),
    usable_hosts: usable, total_addresses: total,
    prefix: prefix,
    ip_class: (() => { const f = base >>> 24; if (f < 128) return 'A'; if (f < 192) return 'B'; if (f < 224) return 'C'; if (f < 240) return 'D'; return 'E'; })(),
    is_private: (f => (f === 10) || (f === 172 && ((base >>> 16) & 255) >= 16 && ((base >>> 16) & 255) <= 31) || (f === 192 && ((base >>> 16) & 255) === 168))(base >>> 24)
  };
}
function inSubnet(ip, cidr) {
  const [net, p] = cidr.split('/'); const prefix = p === undefined ? 32 : +p;
  const mask = prefix === 0 ? 0 : (0xFFFFFFFF << (32 - prefix)) >>> 0;
  return ((ipToInt(ip) & mask) >>> 0) === ((ipToInt(net) & mask) >>> 0);
}
async function routeSubnet(u, res, json) {
  const q = u.searchParams;
  try {
    const cidr = q.get('cidr') || (q.get('ip') ? q.get('ip') + (q.get('mask') ? '/' + maskToPrefix(q.get('mask')) : '') : null);
    if (!cidr) return json(res, 400, { error: 'cidr required, e.g. ?cidr=192.168.1.0/24' });
    const out = calc(cidr);
    const ip = q.get('contains');
    if (ip) out.contains = inSubnet(ip, cidr);
    return json(res, 200, out);
  } catch (e) { return json(res, 400, { error: e.message }); }
}
module.exports = { routeSubnet, calc, inSubnet };
