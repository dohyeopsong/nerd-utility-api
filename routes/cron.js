// Cron expression parser + next-run calculator (5-field standard, no @ macros beyond basics)
const ALIASES = { '@yearly': '0 0 1 1 *', '@annually': '0 0 1 1 *', '@monthly': '0 0 1 * *', '@weekly': '0 0 * * 0', '@daily': '0 0 * * *', '@hourly': '0 * * * *' };
const MONTHS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
const DAYS = ['sun','mon','tue','wed','thu','fri','sat'];
function parseField(field, min, max, names) {
  if (field === '*') return { every: 1, start: min };
  let m;
  if ((m = field.match(/^(\*|\d+)\/(\d+)$/))) { // */n or start/n
    const start = m[1] === '*' ? min : +m[1];
    return { every: +m[2], start };
  }
  if ((m = field.match(/^(\w+)-(\w+)$/))) { // range
    const a = resolve(m[1], names), b = resolve(m[2], names);
    if (a == null || b == null || a > b) throw new Error(`bad range: ${field}`);
    const set = []; for (let i = a; i <= b; i++) set.push(i);
    return { set };
  }
  // list
  const set = field.split(',').map(x => {
    const v = resolve(x, names);
    if (v == null || v < min || v > max) throw new Error(`bad value: ${x} (range ${min}-${max})`);
    return v;
  });
  return { set };
}
function resolve(tok, names) {
  if (/^\d+$/.test(tok)) return +tok;
  const i = (names || []).indexOf(tok.toLowerCase());
  if (i >= 0) return i + (names === MONTHS ? 1 : 0);
  if (names === DAYS) { // allow 7=sun
    if (tok.toLowerCase() === 'sun') return 0;
  }
  return null;
}
function parse(expr) {
  expr = ALIASES[expr] || expr;
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) throw new Error(`expected 5 fields, got ${parts.length}`);
  const [min, hour, dom, mon, dow] = parts.map((f, i) =>
    parseField(f, [0,59][0], [ [0,59],[0,23],[1,31],[1,12],[0,7] ][i][1], [null, null, null, MONTHS, DAYS][i]));
  const or5 = f.fieldOr(0); // placeholder
  return { minute: min, hour, dom, mon, dow };
}
// helpers on Object prototype avoided; use explicit expands below
function expand(spec, min, max, names, offsetSun) {
  if (spec.every) { const s = []; for (let i = spec.start; i <= max; i += spec.every) s.push(i); return s; }
  if (spec.set) return spec.set;
  return [];
}
function nextRun(expr, from = new Date()) {
  const p = parse(expr);
  const mins = expand(p.minute, 0, 59), hours = expand(p.hour, 0, 23),
        mons = expand(p.mon, 1, 12), doms = expand(p.dom, 1, 31), dows = expand(p.dow, 0, 7).map(d => d % 7);
  const domRestricted = !('every' in p.dom && p.dom.every === 1 || 'set' in p.dom === false && !p.dom.set);
  let d = new Date(from.getTime() + 60000);
  d.setSeconds(0, 0);
  for (let i = 0; i < 366 * 24 * 60; i++) { // search up to a year of minutes
    if (!mons.includes(d.getMonth() + 1)) { d = new Date(d.getFullYear(), d.getMonth() + 1, 1, 0, 0); continue; }
    const dayMatch = (doms.includes(d.getDate()) || dows.includes(d.getDay()));
    // standard cron: if both dom and dow are restricted, either may match
    const domStar = JSON.stringify(p.dom) === JSON.stringify({ every: 1, start: 1 });
    const dowStar = JSON.stringify(p.dow) === JSON.stringify({ every: 1, start: 0 });
    const ok = domStar ? dows.includes(d.getDay()) : dowStar ? doms.includes(d.getDate()) : (doms.includes(d.getDate()) || dows.includes(d.getDay()));
    if (!ok) { d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0); continue; }
    if (!hours.includes(d.getHours())) { d.setMinutes(0); d = new Date(d.getTime() + 3600000); continue; }
    if (!mins.includes(d.getMinutes())) { d = new Date(d.getTime() + 60000); continue; }
    return d;
  }
  return null;
}
function describe(expr) {
  const p = parse(expr);
  const f = s => JSON.stringify(s);
  return { raw: expr, minute: f(p.minute), hour: f(p.hour), day_of_month: f(p.dom), month: f(p.mon), day_of_week: f(p.dow) };
}
async function routeCron(u, res, json) {
  const q = u.searchParams;
  const expr = q.get('expr');
  if (!expr) return json(res, 400, { error: 'expr required, e.g. ?expr=0 30 * * *' });
  try {
    const d = describe(expr);
    if (q.get('next') !== null || !q.get('only_parse')) {
      const t = nextRun(expr, q.get('from') ? new Date(q.get('from')) : new Date());
      return json(res, 200, { ...d, next_run: t ? t.toISOString() : null, next_run_unix: t ? Math.floor(t.getTime() / 1000) : null });
    }
    return json(res, 200, d);
  } catch (e) { return json(res, 400, { error: e.message }); }
}
module.exports = { routeCron, parse, nextRun, describe };
