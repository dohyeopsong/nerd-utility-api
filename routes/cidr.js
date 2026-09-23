// /cidr — IPv4 subnet calculator
function ip2int(ip) {
  const parts = ip.split('.');
  if (parts.length !== 4 || parts.some(p => !/^\d{1,3}$/.test(p) || +p > 255)) throw new Error(`invalid IPv4 "${ip}"`);
  return ((+parts[0] << 24) | (+parts[1] << 16) | (+parts[2] << 8) | +parts[3]) >>> 0;
}
function int2ip(n) { return [(n >>> 24), (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.'); }
function routeCidr(u, res, json) {
  const q = Object.fromEntries(u.searchParams.entries());
  const input = q.cidr || q.c;
  if (!input) throw new Error('missing ?cidr=192.168.1.0/24');
  let ip, prefix;
  if (input.includes('/')) { [ip, prefix] = input.split('/'); prefix = parseInt(prefix, 10); }
  else { ip = input; prefix = parseInt(q.prefix || q.mask || '24', 10); }
  if (isNaN(prefix) || prefix < 0 || prefix > 32) throw new Error('prefix must be 0-32');
  const ipInt = ip2int(ip);
  const mask = prefix === 0 ? 0 : (0xFFFFFFFF << (32 - prefix)) >>> 0;
  const network = (ipInt & mask) >>> 0;
  const broadcast = (network | (~mask >>> 0)) >>> 0;
  const total = 2 ** (32 - prefix);
  const usable = prefix >= 31 ? (prefix === 31 ? 2 : 1) : total - 2;
  const first = prefix >= 31 ? network : network + 1;
  const last = prefix >= 31 ? broadcast : broadcast - 1;
  return json(res, 200, {
    cidr: `${int2ip(network)}/${prefix}`,
    network: int2ip(network),
    broadcast: int2ip(broadcast),
    netmask: int2ip(mask),
    wildcard: int2ip(~mask >>> 0),
    firstHost: int2ip(first),
    lastHost: int2ip(last),
    totalAddresses: total,
    usableHosts: usable,
    prefix, maskBits: prefix,
    isPrivate: /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(int2ip(network)) ||
      int2ip(network).startsWith('127.'),
    class: (network >>> 24) < 128 ? 'A' : (network >>> 24) < 192 ? 'B' : (network >>> 24) < 224 ? 'C' : 'D/E',
  });
}
module.exports = { routeCidr };
