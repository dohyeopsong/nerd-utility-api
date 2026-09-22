// /timezone — IANA timezone lookup with current local time
function routeTimezone(u, res, json) {
  const q = u.searchParams;
  const zone = (q.get('zone') || q.get('tz') || '').trim();
  const search = (q.get('q') || '').toLowerCase().trim();

  // list all supported zones (from Intl)
  let zones;
  try { zones = Intl.supportedValuesOf('timeZone'); }
  catch (e) { zones = require('./zones-fallback.json'); }

  if (zone) {
    let dt, fmt;
    try {
      fmt = new Intl.DateTimeFormat('en-US', {
        timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
        timeZoneName: 'longOffset'
      });
      dt = new Date();
      fmt.formatToParts ? null : null;
    } catch (e) {
      return json(res, 400, { error: `invalid timezone: ${zone}` });
    }
    // validate exact zone (accept canonical aliases like UTC/Etc/GMT)
    if (!zones.includes(zone) && !(zone === 'UTC' || zone.startsWith('Etc/'))) {
      // try canonicalizing via Intl
      try {
        const t = new Intl.DateTimeFormat('en-US', { timeZone: zone }).format(new Date());
        if (t === undefined) throw new Error('bad');
      } catch (e) {
        return json(res, 404, { error: `unknown timezone: ${zone}` });
      }
    }
    const parts = {};
    for (const p of fmt.formatToParts(dt)) if (p.type !== 'literal') parts[p.type] = p.value;
    // compute offset in minutes
    const offsetStr = parts.timeZoneName || ''; // e.g. GMT+09:00
    let offsetMinutes = null;
    const m = offsetStr.match(/GMT([+-])(\d{2}):(\d{2})/);
    if (m) offsetMinutes = (m[1] === '-' ? -1 : 1) * (parseInt(m[2]) * 60 + parseInt(m[3]));
    else if (/GMT$/.test(offsetStr.trim())) offsetMinutes = 0;
    return json(res, 200, {
      timezone: zone,
      local_time: `${parts.year}-${parts.month}-${parts.day}T${parts.hour === '24' ? '00' : parts.hour}:${parts.minute}:${parts.second}`,
      utc_offset: offsetMinutes === null ? null : (offsetMinutes >= 0 ? '+' : '-') + String(Math.floor(Math.abs(offsetMinutes) / 60)).padStart(2, '0') + ':' + String(Math.abs(offsetMinutes) % 60).padStart(2, '0'),
      offset_minutes: offsetMinutes,
      epoch_ms: Date.now(),
    });
  }
  if (search) {
    const matches = zones.filter(z => z.toLowerCase().includes(search));
    if (!matches.length) return json(res, 404, { error: `no match for: ${search}` });
    return json(res, 200, { count: matches.length, results: matches });
  }
  return json(res, 200, { count: zones.length, timezones: zones });
}
module.exports = { routeTimezone };
