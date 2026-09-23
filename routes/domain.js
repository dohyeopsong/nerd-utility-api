// /domain — DNS record lookup (A, AAAA, MX, TXT, NS, CNAME, SOA, SRV) via node:dns
const dns = require('dns').promises;

const TYPES = ['A', 'AAAA', 'MX', 'TXT', 'NS', 'CNAME', 'SOA', 'SRV'];

async function routeDomain(u, res, json) {
  const domain = (u.searchParams.get('domain') || u.searchParams.get('d') || '').trim().toLowerCase();
  if (!domain) return json(res, 400, { error: 'missing ?domain=example.com' });
  if (!/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/.test(domain)) return json(res, 400, { error: 'invalid domain syntax' });

  let type = (u.searchParams.get('type') || '').toUpperCase();
  const types = type && TYPES.includes(type) ? [type] : TYPES;

  const results = {};
  await Promise.all(types.map(async (t) => {
    try {
      const resolver = new (require('dns').promises.Resolver)();
      results[t] = await resolver.resolve(domain, t);
      if (t === 'SOA' || t === 'MX' || t === 'SRV') results[t] = results[t]; // objects fine
    } catch (e) {
      if (e.code === 'ENOTFOUND' || e.code === 'ENODATA') results[t] = null;
      else results[t] = { error: e.code || e.message };
    }
  }));
  return json(res, 200, { domain, records: results });
}

module.exports = { routeDomain };
