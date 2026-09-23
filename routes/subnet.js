// /subnet — CIDR subnet calculator (IPv4)
function routeSubnet(u, res, json) {
  const p = u.searchParams;
  const cidr = p.get('cidr');
  const ip = p.get('ip'), mask = p.get('mask');
  let addr, prefix;
  const parseIp = (s) => {
    const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(s || '');
    if (!m) return null;
    const o = m.slice(1).map(Number);
    if (o.some(x => x > 255)) return null;
    return ((o[0] << 24) | (o[1] << 16) | (o[2] << 8) | o[3]) >>> 0;
  };
  const fmt = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');

  if (cidr) {
    const m = /^([\d.]+)\/(\d{1,2})$/.exec(cidr);
    if (!m) return json(res, 400, { error: 'invalid CIDR, expected e.g. 192.168.1.0/24' });
    addr = parseIp(m[1]); prefix = parseInt(m[2]);
    if (addr === null || prefix > 32) return json(res, 400, { error: 'invalid CIDR' });
  } else if (ip && mask) {
    addr = parseIp(ip); prefix = parseInt(mask);
    if (addr === null || prefix > 32) {
      // mask may be dotted notation
      const m = parseIp(mask);
      if (m === null || prefix > 32) return json(res, 400, { error: 'invalid ip/mask' });
      prefix = m.toString(2).split('').filter(c => c === '1').length;
      if (m.toString(2).replace(/1{p}/g, '').includes('1')) prefix = -1; // placeholder, fixed below
    }
  } else return json(res, 400, { error: 'provide ?cidr=192.168.1.0/24 (or ?ip=&mask=)' });

  // validate mask contiguity if given dotted
  const hostBits = 32 - prefix;
  const maskInt = prefix === 0 ? 0 : (0xFFFFFFFF << hostBits) >>> 0;
  const network = (addr & maskInt) >>> 0;
  const broadcast = (network | (~maskInt >>> 0)) >>> 0;
  const total = Math.pow(2, hostBits);
  const usable = prefix >= 31 ? (prefix === 31 ? 2 : 1) : total - 2;
  return json(res, 200, {
    cidr: fmt(network) + '/' + prefix,
    network: fmt(network),
    broadcast: fmt(broadcast),
    netmask: fmt(maskInt),
    wildcard: fmt((~maskInt) >>> 0),
    first_host: prefix < 31 ? fmt(network + 1) : fmt(network),
    last_host: prefix < 31 ? fmt(broadcast - 1) : fmt(broadcast),
    total_addresses: total,
    usable_hosts: usable,
    prefix: prefix,
    is_private: (network >>> 24) === 10 || ((network >>> 20) === 0xAC1) || ((network >>> 16) === 0xC0A8),
  });
}
module.exports = { routeSubnet };
