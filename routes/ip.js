// /ip — IPv4 subnet utilities
function parseIP(s) {
  const m = s.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) throw new Error(`invalid IPv4: ${s}`);
  const o = m.slice(1).map(Number);
  if (o.some(n => n > 255)) throw new Error(`invalid IPv4: ${s}`);
  return ((o[0] << 24) | (o[1] << 16) | (o[2] << 8) | o[3]) >>> 0;
}
function intToIP(n) {
  return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
}
function parseCIDR(s) {
  const [ip, bitsStr] = s.split('/');
  const bits = parseInt(bitsStr, 10);
  if (!Number.isInteger(bits) || bits < 0 || bits > 32) throw new Error(`invalid prefix length: ${bitsStr}`);
  const mask = bits === 0 ? 0 : (0xFFFFFFFF << (32 - bits)) >>> 0;
  const addr = parseIP(ip);
  const network = (addr & mask) >>> 0;
  return { addr, bits, mask, network, broadcast: (network | (~mask >>> 0)) >>> 0, size: 2 ** (32 - bits) };
}

function routeIp(u, res, json) {
  const q = u.searchParams;
  try {
    const cidr = q.get('cidr');
    const contains = q.get('contains');
    const subnets = q.get('subnets');

    if (cidr) {
      const c = parseCIDR(cidr);
      if (contains) {
        const ip = parseIP(contains);
        return json(res, 200, {
          cidr, ip: contains,
          contains: ip >= c.network && ip <= c.broadcast,
        });
      }
      if (subnets) {
        const n = parseInt(subnets, 10);
        if (!Number.isInteger(n) || n < 1 || n > 256 || (n & (n - 1)) !== 0) throw new Error('subnets must be a power of 2, 1-256');
        const newBits = c.bits + Math.log2(n);
        if (newBits > 32) throw new Error(`cannot split /${c.bits} into ${n} subnets`);
        const step = c.size / n;
        const list = [];
        for (let i = 0; i < n; i++) {
          const net = c.network + i * step;
          list.push({ cidr: `${intToIP(net)}/${newBits}`, first: intToIP(net), last: intToIP(net + step - 1), hosts: Math.max(step - 2, 0) });
        }
        return json(res, 200, { cidr, subnets: list });
      }
      return json(res, 200, {
        cidr,
        network: intToIP(c.network),
        broadcast: intToIP(c.broadcast),
        netmask: intToIP(c.mask),
        first_host: intToIP(c.bits >= 31 ? c.network : c.network + 1),
        last_host: intToIP(c.bits >= 31 ? c.broadcast : c.broadcast - 1),
        usable_hosts: c.bits >= 31 ? (c.bits === 31 ? 2 : 1) : c.size - 2,
        total_addresses: c.size,
        mask_bits: c.bits,
      });
    }
    // plain IP info
    const ip = q.get('ip') || q.get('address');
    if (ip) {
      const n = parseIP(ip);
      const priv = /^10\./.test(ip) || /^192\.168\./.test(ip) || /^172\.(1[6-9]|2\d|3[01])\./.test(ip) || ip === '127.0.0.1';
      return json(res, 200, {
        ip, integer: n, hex: '0x' + n.toString(16).padStart(8, '0'),
        binary: n.toString(2).padStart(32, '0').replace(/(.{8})(?=.)/g, '$1.'),
        private: priv, class: n < 0x80000000 ? 'A' : n < 0xC0000000 ? 'B' : n < 0xE0000000 ? 'C' : 'D/E',
      });
    }
    throw new Error('provide ?ip=10.0.0.1 or ?cidr=192.168.1.0/24 (+ &contains=x.x.x.x or &subnets=4)');
  } catch (e) {
    return json(res, 400, { error: e.message, example: '/ip?cidr=192.168.1.0/24, /ip?cidr=10.0.0.0/8&contains=10.1.2.3, /ip?cidr=192.168.0.0/24&subnets=4' });
  }
}
module.exports = { routeIp };
