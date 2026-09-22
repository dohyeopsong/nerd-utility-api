// routes/subnet.js — IPv4 subnet calculator
// GET /subnet?cidr=192.168.1.0/24
function ipToInt(ip) {
  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some(x => isNaN(x) || x < 0 || x > 255)) throw new Error('invalid IPv4: ' + ip);
  return ((p[0] << 24) | (p[1] << 16) | (p[2] << 8) | p[3]) >>> 0;
}
const intToIp = n => [ (n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255 ].join('.');

function routeSubnet(u, res, json) {
  const cidr = u.searchParams.get('cidr');
  if (!cidr) return json(res, 400, { error: 'cidr required, e.g. ?cidr=192.168.1.0/24' });
  const [ip, bitsStr] = cidr.split('/');
  const bits = bitsStr === undefined ? 32 : parseInt(bitsStr, 10);
  if (!/^\d+$/.test(bitsStr ?? '') || bits < 0 || bits > 32) return json(res, 400, { error: 'prefix must be 0-32' });
  let base;
  try { base = ipToInt(ip); } catch (e) { return json(res, 400, { error: e.message }); }
  const mask = bits === 0 ? 0 : (0xFFFFFFFF << (32 - bits)) >>> 0;
  const network = (base & mask) >>> 0;
  const broadcast = (network | (~mask >>> 0)) >>> 0;
  const total = Math.pow(2, 32 - bits);
  const usable = bits <= 30 ? total - 2 : total;
  return json(res, 200, {
    cidr: intToIp(network) + '/' + bits,
    network: intToIp(network), broadcast: intToIp(broadcast),
    netmask: intToIp(mask), wildcard: intToIp(~mask >>> 0),
    firstHost: bits <= 30 ? intToIp(network + 1) : intToIp(network),
    lastHost: bits <= 30 ? intToIp(broadcast - 1) : intToIp(broadcast),
    totalAddresses: total, usableHosts: usable,
    maskBits: bits,
    maskHex: '0x' + mask.toString(16).padStart(8, '0'),
    ipClass: (() => { const f = (network >>> 24) & 255; return f < 128 ? 'A' : f < 192 ? 'B' : f < 224 ? 'C' : f < 240 ? 'D (multicast)' : 'E'; })(),
    isPrivate: /^10\./.test(ip) || /^172\.(1[6-9]|2\d|3[01])\./.test(ip) || /^192\.168\./.test(ip)
  });
}
module.exports = { routeSubnet };
