// /sunrise — sunrise/sunset times for a location and date (NOAA solar calculation)
function routeSunrise(u, res, json) {
  const q = Object.fromEntries(u.searchParams.entries());
  const lat = parseFloat(q.lat), lon = parseFloat(q.lon);
  if (isNaN(lat) || lat < -90 || lat > 90) throw new Error('invalid ?lat= (-90..90)');
  if (isNaN(lon) || lon < -180 || lon > 180) throw new Error('invalid ?lon= (-180..180)');
  const d = q.date ? new Date(q.date + 'T12:00:00Z') : new Date();
  if (isNaN(d)) throw new Error('invalid ?date=YYYY-MM-DD');

  // Day of year
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  const doy = Math.floor((d.getTime() - start) / 86400000);

  // NOAA approximation
  const gamma = (2 * Math.PI / 365) * (doy - 1 + (d.getUTCHours() - 12) / 24);
  const eqTime = 229.18 * (0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma)
    - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma));
  const decl = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma)
    - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma)
    - 0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma);

  const zenith = 90.833 * Math.PI / 180;
  const cosH = (Math.cos(zenith) - Math.sin(lat * Math.PI / 180) * Math.sin(decl)) /
               (Math.cos(lat * Math.PI / 180) * Math.cos(decl));

  const tzOffset = q.tz !== undefined ? parseFloat(q.tz) : -d.getTimezoneOffset() / 60;
  if (isNaN(tzOffset) || Math.abs(tzOffset) > 14) throw new Error('invalid ?tz= (-14..14)');

  if (cosH > 1) return json(res, 200, {
    date: d.toISOString().slice(0, 10), lat, lon,
    sunrise: null, sunset: null,
    note: 'polar night — sun does not rise', dayLengthHours: 0,
  });
  if (cosH < -1) return json(res, 200, {
    date: d.toISOString().slice(0, 10), lat, lon,
    sunrise: null, sunset: null,
    note: 'midnight sun — sun does not set', dayLengthHours: 24,
  });

  const H = Math.acos(cosH) * 180 / Math.PI;
  const noonMin = 720 - 4 * lon - eqTime + tzOffset * 60;
  const rise = noonMin - 4 * H, set = noonMin + 4 * H;
  const fmt = m => {
    const t = new Date(d); t.setUTCHours(0, Math.round(m), 0, 0);
    return t.toISOString().slice(11, 16) + ' (tz=' + tzOffset + ')';
  };
  return json(res, 200, {
    date: d.toISOString().slice(0, 10), lat, lon,
    sunrise: fmt(rise), sunset: fmt(set),
    solarNoon: fmt(noonMin),
    dayLengthHours: +((set - rise) / 60).toFixed(2),
  });
}
module.exports = { routeSunrise };
