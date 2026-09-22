// /convert — unit conversion (length, mass, temperature, data, time)
const FAMILIES = {
  length: { m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.344, yd: 0.9144, ft: 0.3048, in: 0.0254, nmi: 1852, ly: 9.4607304725808e15, au: 1.495978707e11 },
  mass: { kg: 1, g: 0.001, mg: 1e-6, t: 1000, lb: 0.45359237, oz: 0.028349523125, st: 6.35029318 },
  data: { B: 1, KB: 1024, MB: 1024**2, GB: 1024**3, TB: 1024**4, PB: 1024**5, bit: 0.125 },
  time: { s: 1, ms: 0.001, min: 60, h: 3600, d: 86400, wk: 604800, yr: 31557600 },
  speed: { 'm/s': 1, 'km/h': 1/3.6, mph: 0.44704, kn: 0.514444 },
  volume: { L: 1, mL: 0.001, m3: 1000, gal: 3.785411784, qt: 0.946352946, pt: 0.473176473, cup: 0.2365882365, floz: 0.0295735295625 },
};
const TEMP = ['c', 'f', 'k', 'r'];

function convertTemp(v, from, to) {
  // normalize to celsius
  let c = from === 'c' ? v : from === 'f' ? (v - 32) * 5/9 : from === 'k' ? v - 273.15 : (v - 491.67) * 5/9;
  return to === 'c' ? c : to === 'f' ? c * 9/5 + 32 : to === 'k' ? c + 273.15 : (c + 273.15) * 9/5;
}

function routeConvert(u, res, json) {
  const q = Object.fromEntries(u.searchParams.entries());
  const value = parseFloat(q.value);
  if (q.value === undefined || isNaN(value)) throw new Error('missing/invalid ?value=');
  const from = (q.from || '').toLowerCase(), to = (q.to || '').toLowerCase();
  if (!from || !to) throw new Error('need ?from= and ?to= units');

  if (TEMP.includes(from) && TEMP.includes(to)) {
    const out = convertTemp(value, from, to);
    return json(res, 200, { value, from, to, result: +out.toFixed(6), family: 'temperature' });
  }
  for (const [fam, units] of Object.entries(FAMILIES)) {
    if (from in units && to in units) {
      const out = value * units[from] / units[to];
      return json(res, 200, { value, from, to, result: +out.toPrecision(12), family: fam });
    }
  }
  const all = Object.keys(FAMILIES).map(f => `${f}: ${Object.keys(FAMILIES[f]).join(',')}`).join('; ')
    + '; temperature: c,f,k,r';
  throw new Error(`unknown units "${q.from}"->"${q.to}". Supported: ${all}`);
}
module.exports = { routeConvert };
