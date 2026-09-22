// routes/units.js — unit conversion (length, mass, temperature, data, time)
// GET /units?from=km&to=mi&value=5
// GET /units?list=1

const FACTORS = {
  // length (meters)
  length: { mm: 1e-3, cm: 1e-2, m: 1, km: 1000, in: 0.0254, inch: 0.0254, ft: 0.3048, foot: 0.3048, feet: 0.3048, yd: 0.9144, mi: 1609.344, mile: 1609.344, nmi: 1852 },
  // mass (grams)
  mass: { mg: 1e-3, g: 1, kg: 1000, t: 1e6, oz: 28.349523125, lb: 453.59237, lbs: 453.59237, lbm: 453.59237, st: 6350.29318 },
  // data (bytes)
  data: { b: 1, kb: 1e3, kib: 1024, mb: 1e6, mib: 1024 ** 2, gb: 1e9, gib: 1024 ** 3, tb: 1e12, tib: 1024 ** 4 },
  // time (seconds)
  time: { ms: 1e-3, s: 1, sec: 1, min: 60, h: 3600, hr: 3600, d: 86400, wk: 604800, wknd: 1209600 }
};
const CATEGORY = {};
for (const [cat, units] of Object.entries(FACTORS)) for (const u of Object.keys(units)) CATEGORY[u] = cat;

// temperature handled separately
function temp(v, from, to) {
  let c;
  if (from === 'c') c = v; else if (from === 'f') c = (v - 32) * 5 / 9; else if (from === 'k') c = v - 273.15; else throw new Error('unknown temp unit');
  if (to === 'c') return c;
  if (to === 'f') return c * 9 / 5 + 32;
  if (to === 'k') return c + 273.15;
  throw new Error('unknown temp unit');
}

function routeUnits(u, res, json) {
  const g = (k) => u.searchParams.get(k);
  if (g('list')) {
    return json(res, 200, {
      length: Object.keys(FACTORS.length), mass: Object.keys(FACTORS.mass),
      temperature: ['c', 'f', 'k'], data: Object.keys(FACTORS.data), time: Object.keys(FACTORS.time)
    });
  }
  const value = parseFloat(g('value') ?? '1');
  const from = (g('from') || '').toLowerCase(), to = (g('to') || '').toLowerCase();
  if (!Number.isFinite(value)) return json(res, 400, { error: 'value must be a number' });
  if (!from || !to) return json(res, 400, { error: 'from and to required, e.g. ?from=km&to=mi&value=5' });
  if ((from === 'c' || from === 'f' || from === 'k') && (to === 'c' || to === 'f' || to === 'k')) {
    return json(res, 200, { value, from, to, result: +temp(value, from, to).toFixed(6) });
  }
  const cat = CATEGORY[from];
  if (!cat) return json(res, 400, { error: `unknown unit '${from}'. See /units?list=1` });
  if (CATEGORY[to] !== cat) return json(res, 400, { error: `incompatible units: '${from}' (${cat}) -> '${to}' (${CATEGORY[to] || '?'})` });
  const result = value * FACTORS[cat][from] / FACTORS[cat][to];
  return json(res, 200, { value, from, to, category: cat, result: +result.toPrecision(10) });
}
module.exports = { routeUnits };
