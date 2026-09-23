// /geohash — encode lat/lng to geohash, decode geohash to bounding box
const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

function encodeGeohash(lat, lon, precision) {
  let idx = 0, bit = 0, evenBit = true, geohash = '';
  let latMin = -90, latMax = 90, lonMin = -180, lonMax = 180;
  while (geohash.length < precision) {
    if (evenBit) {
      const lonMid = (lonMin + lonMax) / 2;
      if (lon >= lonMid) { idx = idx * 2 + 1; lonMin = lonMid; } else { idx = idx * 2; lonMax = lonMid; }
    } else {
      const latMid = (latMin + latMax) / 2;
      if (lat >= latMid) { idx = idx * 2 + 1; latMin = latMid; } else { idx = idx * 2; latMax = latMid; }
    }
    evenBit = !evenBit;
    if (++bit === 5) { geohash += BASE32[idx]; bit = 0; idx = 0; }
  }
  return geohash;
}

function decodeGeohash(geohash) {
  let evenBit = true, latMin = -90, latMax = 90, lonMin = -180, lonMax = 180;
  geohash = geohash.toLowerCase();
  for (const c of geohash) {
    const idx = BASE32.indexOf(c);
    if (idx < 0) return null;
    for (let n = 4; n >= 0; n--) {
      const bit = (idx >> n) & 1;
      if (evenBit) {
        const lonMid = (lonMin + lonMax) / 2;
        if (bit) lonMin = lonMid; else lonMax = lonMid;
      } else {
        const latMid = (latMin + latMax) / 2;
        if (bit) latMin = latMid; else latMax = latMid;
      }
      evenBit = !evenBit;
    }
  }
  return {
    lat: (latMin + latMax) / 2,
    lon: (lonMin + lonMax) / 2,
    bounds: { latMin, latMax, lonMin, lonMax },
    lat_error: (latMax - latMin) / 2,
    lon_error: (lonMax - lonMin) / 2,
  };
}

function routeGeohash(u, res, json) {
  const p = u.searchParams;
  if (p.get('encode') === null && p.get('decode') === null && !p.get('lat'))
    return json(res, 200, { usage: '?encode&lat=51.5&lng=-0.1&precision=9 or ?decode=u10fw' });
  if (p.get('decode')) {
    const h = p.get('decode');
    if (!/^[0123456789bcdefghjkmnpqrstuvwxyz]+$/i.test(h)) return json(res, 400, { error: 'invalid geohash' });
    const d = decodeGeohash(h);
    return json(res, 200, { geohash: h, latitude: d.lat, longitude: d.lon, bounds: d.bounds, error_meters: { lat: Math.round(d.lat_error * 111320), lon: Math.round(d.lon_error * 111320 * Math.cos(d.lat * Math.PI / 180)) } });
  }
  const lat = parseFloat(p.get('lat')), lng = parseFloat(p.get('lng') ?? p.get('lon'));
  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180)
    return json(res, 400, { error: 'lat must be -90..90, lng -180..180' });
  const precision = Math.max(1, Math.min(12, parseInt(p.get('precision') || '9', 10) || 9));
  const geohash = encodeGeohash(lat, lng, precision);
  const neighbors = {
    north: encodeGeohash(Math.min(90, lat + (decodeGeohash(geohash).lat_error || 0.001) * 2.2), lng, precision),
    south: encodeGeohash(Math.max(-90, lat - (decodeGeohash(geohash).lat_error || 0.001) * 2.2), lng, precision),
    east: encodeGeohash(lat, Math.min(180, lng + (decodeGeohash(geohash).lon_error || 0.001) * 2.2), precision),
    west: encodeGeohash(lat, Math.max(-180, lng - (decodeGeohash(geohash).lon_error || 0.001) * 2.2), precision),
  };
  return json(res, 200, { latitude: lat, longitude: lng, precision, geohash, neighbors });
}
module.exports = { routeGeohash };
