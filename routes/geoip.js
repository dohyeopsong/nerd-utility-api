// /geoip — IP geolocation lookup using ip-api.com free tier (no key, 45 req/min limit)
const https = require('https');
function routeGeoip(u, res, json) {
  const p = u.searchParams;
  const ip = p.get('ip');
  if (!ip) return json(res, 200, { usage: '?ip=8.8.8.8 — geolocation lookup via ip-api.com free tier' });
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return json(res, 400, { error: 'invalid IPv4 address' });
  const opts = { hostname: 'ip-api.com', path: `/json/${encodeURIComponent(ip)}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,reverse,query`, timeout: 8000 };
  const req = https.get(opts, r => {
    let body = '';
    r.on('data', c => body += c);
    r.on('end', () => {
      try {
        const d = JSON.parse(body);
        if (d.status === 'fail') return json(res, 502, { error: d.message || 'upstream lookup failed', ip });
        return json(res, 200, d);
      } catch (e) { return json(res, 502, { error: 'bad upstream response' }); }
    });
  });
  req.on('timeout', () => { req.destroy(); json(res, 504, { error: 'upstream timeout' }); });
  req.on('error', e => json(res, 502, { error: 'upstream error: ' + e.message }));
}
module.exports = { routeGeoip };
