// /haversine — great-circle distance between two lat/lon points
function toRad(d) { return d * Math.PI / 180; }
function routeHaversine(u, res, json) {
  const p = u.searchParams;
  const lat1 = parseFloat(p.get('lat1') ?? p.get('from_lat'));
  const lon1 = parseFloat(p.get('lon1') ?? p.get('from_lon'));
  const lat2 = parseFloat(p.get('lat2') ?? p.get('to_lat'));
  const lon2 = parseFloat(p.get('lon2') ?? p.get('to_lon'));
  if ([lat1, lon1, lat2, lon2].some(v => isNaN(v))) {
    return json(res, 200, { usage: '?lat1=52.5200&lon1=13.4050&lat2=48.8566&lon2=2.3522 — great-circle distance (km, mi, nmi). Alternatively from=lat,lon&to=lat,lon' });
  }
  if (Math.abs(lat1) > 90 || Math.abs(lat2) > 90 || Math.abs(lon1) > 180 || Math.abs(lon2) > 180) {
    return json(res, 400, { error: 'lat must be [-90,90], lon [-180,180]' });
  }
  const R = 6371.0088; // mean Earth radius, km
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.asin(Math.sqrt(a));
  const km = R * c;
  const initialBearing = (() => {
    const y = Math.sin(toRad(lon2 - lon1)) * Math.cos(toRad(lat2));
    const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1));
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  })();
  const midpoint = (() => {
    const bx = Math.cos(toRad(lat2)) * Math.cos(toRad(lon2 - lon1));
    const by = Math.cos(toRad(lat2)) * Math.sin(toRad(lon2 - lon1));
    const mlat = Math.atan2(Math.sin(toRad(lat1)) + Math.sin(toRad(lat2)), Math.sqrt((Math.cos(toRad(lat1)) + bx) ** 2 + by ** 2)) * 180 / Math.PI;
    const mlon = toRad(lon1) + Math.atan2(by, Math.cos(toRad(lat1)) + bx);
    return [(Math.round(mlat * 1e6) / 1e6), (Math.round(((mlon * 180 / Math.PI + 540) % 360 - 180) * 1e6) / 1e6)];
  })();
  return json(res, 200, {
    from: { lat: lat1, lon: lon1 }, to: { lat: lat2, lon: lon2 },
    distance_km: +km.toFixed(3),
    distance_mi: +(km * 0.621371).toFixed(3),
    distance_nmi: +(km / 1.852).toFixed(3),
    initial_bearing_deg: +initialBearing.toFixed(1),
    midpoint: { lat: midpoint[0], lon: midpoint[1] },
  });
}
module.exports = { routeHaversine };
