// /whois — RDAP domain lookup
const https = require('https');

function fetchJSON(url, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { Accept: 'application/rdap+json, application/json', 'User-Agent': 'nerd-utility-api/1.0' } }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        if (res.statusCode >= 400) return reject(new Error(`upstream ${res.statusCode}`));
        try { resolve(JSON.parse(data)); } catch (e) { reject(new Error('bad JSON from upstream')); }
      });
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function routeWhois(u, res, json) {
  const q = u.searchParams;
  const domain = (q.get('domain') || '').toLowerCase().trim();
  if (!domain) return json(res, 400, { error: 'domain required' });
  if (!/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/.test(domain)) return json(res, 400, { error: 'invalid domain' });
  const tld = domain.split('.').pop();
  try {
    // IANA bootstrap: find RDAP server for TLD
    const bootstrap = await fetchJSON('https://data.iana.org/rdap/dns.json');
    const svc = bootstrap.services.find(([tlds]) => tlds.includes(tld));
    if (!svc) return json(res, 501, { error: `no RDAP service for .${tld}` });
    const base = svc[1][0].replace(/\/$/, '');
    const data = await fetchJSON(`${base}/domain/${domain}`);
    const events = {};
    (data.events || []).forEach((e) => { if (e.eventAction) events[e.eventAction] = e.eventDate; });
    const out = {
      domain,
      handle: data.handle,
      registrar: (data.entities || []).find((e) => (e.roles || []).includes('registrar'))?.vcardArray?.[1]?.find(v => v[0] === 'fn')?.[3] || undefined,
      status: data.status,
      nameservers: (data.nameservers || []).map((n) => n.ldhName),
      dates: events,
    };
    return json(res, 200, out);
  } catch (e) {
    if (String(e.message).includes('upstream 404')) return json(res, 404, { error: 'domain not found' });
    return json(res, 502, { error: `rdap lookup failed: ${e.message}` });
  }
}
module.exports = { routeWhois };
