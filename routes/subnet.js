// Subnet calculator: /subnet?cidr=192.168.1.0/24 — full analysis
// /subnet?ip=10.0.0.5&mask=255.255.255.192 — from IP + dotted mask
const parseIP = s => { const p = s.split('.').map(Number); if (p.length !== 4 || p.some(x => isNaN(x) || x < 0 || x > 255)) return null; return ((p[0] << 24) | (p[1] << 16) | (p[2] << 8) | p[3]) >>> 0; };
const toIP = n => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
const isPrivate = n => { const a = (n >>> 24) & 255; const b = (n >>> 16) & 255; return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a === 127; };
async function routeSubnet(u, res, json) {
  const cidr = u.searchParams.get('cidr');
  const ip = u.searchParams.get('ip'), mask = u.searchParams.get('mask');
  let addr = null, prefix = null;
  if (cidr) {
    const [a, p] = cidr.split('/');
    addr = parseIP(a); prefix = p === undefined ? null : +p;
    if (addr === null || prefix === null || isNaN(prefix) || prefix < 0 || prefix > 32) return json(res, 400, { error: 'invalid CIDR (expected e.g. 192.168.1.0/24)' });
  } else if (ip && mask) {
    addr = parseIP(ip);
    const m = parseIP(mask);
    if (addr === null || m === null) return json(res, 400, { error: 'invalid ip or mask' });
    const bits = m.toString(2).padStart(32, '0');
    const ones = bits.match(/^1*/)[0].length;
    if (bits.slice(ones).includes('1')) return json(res, 400, { error: 'invalid mask (not contiguous)' });
    prefix = ones;
  } else return json(res, 400, { error: 'provide ?cidr=192.168.1.0/24 or ?ip=10.0.0.5&mask=255.255.255.0' });
  const hostBits = 32 - prefix;
  const network = (addr & (prefix === 0 ? 0 : (0xFFFFFFFF << (32 - prefix)) >>> 0)) >>> 0;
  const broadcast = (network | (hostBits === 32 ? 0xFFFFFFFF : ((1 << hostBits) - 1))) >>> 0;
  const total = 2 ** hostBits;
  const usable = total > 2 ? total - 2 : total;
  const firstHost = total > 2 ? network + 1 : null;
  const lastHost = total > 2 ? broadcast - 1 : null;
  const maskStr = toIP((prefix === 0 ? 0 : (0xFFFFFFFF << (32 - prefix)) >>> 0));
  return json(res, 200, {
    network: toIP(network), broadcast: toIP(broadcast), cidr: toIP(network) + '/' + prefix,
    netmask: maskStr, wildcard: toIP(~((prefix === 0 ? 0 : (0xFFFFFFFF << (32 - prefix)) >>> 0)) >>> 0),
    prefix, hostBits, totalAddresses: total, usableAddresses: usable,
    firstHost: firstHost !== null ? toIP(firstHost) : null, lastHost: lastHost !== null ? toIP(lastHost) : null,
    networkClass: prefix <= 8 ? 'A' : prefix <= 16 ? 'B' : prefix <= 24 ? 'C' : 'none',
    isPrivate: isPrivate(network), hasHosts: total > 2
  });
}
module.exports = { routeSubnet };
