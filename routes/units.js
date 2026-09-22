// /units — convert between units (length, mass, temperature, data, speed)
const FACTORS = {
  length: { mm: 0.001, cm: 0.01, m: 1, km: 1000, in: 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.344, nmi: 1852 },
  mass: { mg: 1e-6, g: 0.001, kg: 1, t: 1000, oz: 0.028349523125, lb: 0.45359237, st: 6.35029318 },
  data: { b: 1, kb: 1000, mb: 1e6, gb: 1e9, tb: 1e12, kib: 1024, mib: 1048576, gib: 1073741824, tib: 1099511627776 },
  speed: { 'm/s': 1, 'km/h': 0.2777777778, mph: 0.44704, kn: 0.5144444444, 'ft/s': 0.3048 },
  area: { 'm2': 1, 'cm2': 1e-4, 'km2': 1e6, ha: 1e4, 'ft2': 0.09290304, ac: 4046.8564224, 'mi2': 2589988.110336 },
  volume: { ml: 0.001, l: 1, 'm3': 1000, tsp: 0.00492892159375, tbsp: 0.01478676478125, 'fl oz': 0.0295735295625, cup: 0.2365882365, pt: 0.473176473, qt: 0.946352946, gal: 3.785411784 }
};
const TEMPS = ['c', 'f', 'k'];

function tempConvert(v, from, to) {
  // normalize to celsius
  let c = v;
  if (from === 'f') c = (v - 32) * 5 / 9;
  else if (from === 'k') c = v - 273.15;
  if (to === 'c') return c;
  if (to === 'f') return c * 9 / 5 + 32;
  if (to === 'k') return c + 273.15;
  return null;
}

function routeUnits(u, res, json) {
  const q = u.searchParams;
  const v = parseFloat(q.get('value'));
  const from = (q.get('from') || '').toLowerCase().trim();
  const to = (q.get('to') || '').toLowerCase().trim();
  if (isNaN(v)) return json(res, 400, { error: 'provide ?value=&from=&to=', example: '/units?value=100&from=cm&to=in' });
  if (!from || !to) return json(res, 400, { error: 'provide both from= and to= units', categories: Object.keys(FACTORS) });

  // temperature special-case
  if (TEMPS.includes(from) || TEMPS.includes(to)) {
    if (!TEMPS.includes(from) || !TEMPS.includes(to)) {
      return json(res, 400, { error: 'temperature units are c, f, k — cannot mix with other categories' });
    }
    const r = tempConvert(v, from, to);
    return json(res, 200, { value: v, from, to, category: 'temperature', result: Math.round(r * 1000) / 1000 });
  }

  for (const [cat, units] of Object.entries(FACTORS)) {
    if (from in units && to in units) {
      const base = v * units[from];
      const r = base / units[to];
      return json(res, 200, {
        value: v, from, to, category: cat,
        result: Math.round(r * 1e6) / 1e6,
        available_units: Object.keys(units)
      });
    }
  }
  return json(res, 400, { error: `cannot convert ${from} -> ${to}`, categories: Object.keys(FACTATORS || FACTORS) });
}

module.exports = { routeUnits };
