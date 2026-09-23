// /units — convert between units (length, mass, temperature, data, volume, time)
const L = { m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.344, yd: 0.9144, ft: 0.3048, in: 0.0254, nmi: 1852 };
const M = { kg: 1, g: 0.001, mg: 1e-6, t: 1000, lb: 0.45359237, oz: 0.028349523125, st: 6.35029318 };
const D = { B: 1, KB: 1024, MB: 1024**2, GB: 1024**3, TB: 1024**4, PB: 1024**5, KiB: 1000, MiB: 1e6, GiB: 1e9, TiB: 1e12 };
const V = { l: 1, ml: 0.001, m3: 1000, gal: 3.785411784, qt: 0.946352946, pt: 0.473176473, cup: 0.2365882365, floz: 0.0295735295625, tbsp: 0.01478676478125, tsp: 0.00492892159375 };
const T = { s: 1, ms: 0.001, min: 60, h: 3600, d: 86400, wk: 604800, yr: 31557600 };
const GROUPS = { length: L, mass: M, data: D, volume: V, time: T };

function temp(v, from, to) {
  const f = from.toLowerCase(), t = to.toLowerCase();
  if (!['c','f','k'].includes(f) || !['c','f','k'].includes(t)) return null;
  let c = f === 'c' ? v : f === 'f' ? (v - 32) * 5 / 9 : v - 273.15;
  if (t === 'c') return c;
  if (t === 'f') return c * 9 / 5 + 32;
  return c + 273.15;
}

function routeUnits(u, res, json) {
  const p = u.searchParams;
  if (!p.get('to')) return json(res, 200, {
    usage: '?value=10&from=km&to=mi — also ?groups=1 to list units',
    groups: p.get('groups') ? Object.fromEntries(Object.entries(GROUPS).map(([g, u]) => [g, Object.keys(u)])) : undefined,
    temperature: ['c', 'f', 'k'],
  });
  const value = parseFloat(p.get('value'));
  const from = (p.get('from') || '').toLowerCase(), to = (p.get('to') || '').toLowerCase();
  if (isNaN(value)) return json(res, 400, { error: 'invalid value' });

  if (['c','f','k'].includes(from) && ['c','f','k'].includes(to)) {
    const r = temp(value, from, to);
    return json(res, 200, { value, from, to, result: Math.round(r * 1e6) / 1e6, type: 'temperature' });
  }
  for (const [g, table] of Object.entries(GROUPS)) {
    if (table[from] !== undefined && table[to] !== undefined) {
      const r = value * table[from] / table[to];
      return json(res, 200, { value, from, to, result: Math.round(r * 1e10) / 1e10, type: g });
    }
  }
  return json(res, 400, { error: `cannot convert '${from}' to '${to}'. Use ?groups=1 to list supported units.` });
}
module.exports = { routeUnits };
