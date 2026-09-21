// Unit converter: length, mass, temperature, data, time
const FACTORS = {
  length: { m: 1, km: 1000, cm: 0.01, mm: 0.001, um: 1e-6, mi: 1609.344, yd: 0.9144, ft: 0.3048, in: 0.0254, nmi: 1852 },
  mass: { kg: 1, g: 0.001, mg: 1e-6, t: 1000, lb: 0.45359237, oz: 0.028349523125, st: 6.35029318 },
  data: { B: 1, KB: 1000, MB: 1e6, GB: 1e9, TB: 1e12, KiB: 1024, MiB: 1048576, GiB: 1073741824, TiB: 1099511627776, b: 0.125 },
  time: { s: 1, ms: 0.001, us: 1e-6, min: 60, h: 3600, d: 86400, wk: 604800, yr: 31557600 }
};
const TEMPS = ['C','F','K','R'];
function toTemp(v, from, to) {
  from = from.toUpperCase(); to = to.toUpperCase();
  if (!TEMPS.includes(from) || !TEMPS.includes(to)) return null;
  let c;
  if (from === 'C') c = v; else if (from === 'F') c = (v - 32) * 5/9; else if (from === 'K') c = v - 273.15; else c = (v - 491.67) * 5/9;
  if (to === 'C') return c; if (to === 'F') return c * 9/5 + 32; if (to === 'K') return c + 273.15; return (c + 273.15) * 9/5;
}
function routeConvert(u, res, json) {
  const cat = u.searchParams.get('cat');
  const val = parseFloat(u.searchParams.get('value'));
  const from = u.searchParams.get('from');
  const to = u.searchParams.get('to');
  if (!cat || isNaN(val) || !from || !to) return json(res, 400, { error: 'params: cat, value, from, to', categories: Object.keys(FACTORS).concat('temperature') });
  if (cat === 'temperature') {
    const out = toTemp(val, from, to);
    if (out === null) return json(res, 400, { error: 'unknown temperature unit (C/F/K/R)' });
    return json(res, 200, { cat, value: val, from, to, result: Math.round(out * 1e6) / 1e6 });
  }
  const f = FACTORS[cat];
  if (!f) return json(res, 400, { error: 'unknown category', categories: Object.keys(FACTORS).concat('temperature') });
  if (!(from in f) || !(to in f)) return json(res, 400, { error: 'unknown unit for ' + cat, units: Object.keys(f) });
  const result = val * f[from] / f[to];
  return json(res, 200, { cat, value: val, from, to, result: Math.round(result * 1e9) / 1e9 });
}
module.exports = { routeConvert };
