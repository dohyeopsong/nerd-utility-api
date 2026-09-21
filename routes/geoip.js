// /geoip?ip=8.8.8.8 — IP geolocation with ASN/org info (ip-api.com, no key needed)
function routeGeoip(u, res, json) {
  const q = Object.fromEntries(new URL(u, 'http://x').searchParams);
  const ip = (q.ip || '').trim();
  const fields = 'status,message,continent,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,asname,reverse,mobile,proxy,hosting,query';

  fetchGeoip(ip, fields)
    .then(data => {
      if (data.status === 'fail') return json(res, 400, { error: data.message || 'lookup failed', query: ip });
      json(res, 200, {
        ip: data.query || ip,
        city: data.city, region: data.regionName, regionCode: data.region,
        country: data.country, countryCode: data.countryCode, continent: data.continent,
        lat: data.lat, lon: data.lon, timezone: data.timezone, zip: data.zip,
        isp: data.isp, org: data.org,
        asn: data.as ? parseInt(String(data.as).split(' ')[0]) || data.as : null,
        asName: data.asname,
        reverseDns: data.reverse || null,
        flags: { mobile: !!data.mobile, proxy: !!data.proxy, hosting: !!data.hosting }
      });
    })
    .catch(e => json(res, 502, { error: 'geoip lookup failed: ' + e.message }));
}

async function fetchGeoip(ip, fields) {
  const target = ip
    ? `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=${fields}`
    : `http://ip-api.com/json/?fields=${fields}`;
  const r = await fetch(target, { signal: AbortSignal.timeout(6000) });
  if (!r.ok) throw new Error('upstream ' + r.status);
  return r.json();
}

module.exports = { routeGeoip };
