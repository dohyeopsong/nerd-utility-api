// /domain — domain syntax validation + DNS resolution
const dns = require('dns').promises;

function validateDomainSyntax(d) {
  if (!d || d.length > 253) return false;
  if (d.endsWith('.')) d = d.slice(0, -1);
  if (!d.includes('.')) return false;
  const labels = d.split('.');
  if (labels.length < 2) return false;
  return labels.every(l =>
    l.length >= 1 && l.length <= 63 &&
    /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i.test(l)
  );
}

function getTld(d) { return d.slice(d.lastIndexOf('.') + 1).toLowerCase(); }

async function routeDomain(u, res, json) {
  const q = u.searchParams.get('d') || u.searchParams.get('domain');
  if (!q) return json(res, 400, { error: 'provide ?d=example.com' });
  const d = q.trim().toLowerCase().replace(/\.$/, '');
  const result = { domain: d, valid: validateDomainSyntax(d), tld: getTld(d) };
  if (!result.valid) return json(res, 200, result);

  try {
    const [a, aaaa] = await Promise.all([
      dns.resolve4(d).catch(() => []),
      dns.resolve6(d).catch(() => [])
    ]);
    result.a = a; result.aaaa = aaaa;
    result.resolves = a.length > 0 || aaaa.length > 0;
  } catch (e) { result.resolves = false; }

  const type = u.searchParams.get('type') || 'A';
  if (['A', 'AAAA', 'MX', 'TXT', 'NS', 'CNAME', 'SOA'].includes(type)) {
    try {
      const records = await dns.resolve(d, type);
      result[type] = records;
    } catch (e) { result[type] = []; }
  }
  return json(res, 200, result);
}

module.exports = { routeDomain, validateDomainSyntax };
