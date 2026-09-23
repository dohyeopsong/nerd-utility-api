// /cron — parse cron expressions, explain in English, compute next N runs
const ALIASES = { '@yearly': '0 0 1 1 *', '@annually': '0 0 1 1 *', '@monthly': '0 0 1 * *', '@weekly': '0 0 * * 0', '@daily': '0 0 * * *', '@midnight': '0 0 * * *', '@hourly': '0 * * * *' };
const MONTHS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
const DAYS = ['sun','mon','tue','wed','thu','fri','sat'];

function parseField(expr, min, max, names, isDow) {
  const vals = new Set();
  for (const part of expr.split(',')) {
    let [range, step] = part.split('/');
    step = step ? parseInt(step, 10) : 1;
    if (step < 1 || step > max) throw `invalid step: ${part}`;
    let lo, hi;
    if (range === '*') { lo = min; hi = max; }
    else if (range.includes('-')) {
      const [a, b] = range.split('-');
      lo = names ? toNum(a, names, min) : parseInt(a, 10);
      hi = names ? toNum(b, names, min) : parseInt(b, 10);
      if (isNaN(lo) || isNaN(hi) || lo < min || hi > max || lo > hi) throw `invalid range: ${part}`;
    } else {
      lo = names ? toNum(range, names, min) : parseInt(range, 10);
      if (isNaN(lo) || lo < min || lo > max) throw `invalid value: ${part}`;
      hi = step > 1 ? max : lo;
      if (part.includes('/')) hi = max; // N/M means starting at N, step M
    }
    for (let v = lo; v <= hi; v += step) vals.add(isDow && v === 7 ? 0 : v);
  }
  if (!vals.size) throw `empty field: ${expr}`;
  return vals;
}
function toNum(s, names, min) {
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  const i = names.indexOf(s.slice(0, 3).toLowerCase());
  if (i >= 0) return i + (names === MONTHS ? 1 : 0);
  return NaN;
}
function nextRuns(minute, hour, dom, mon, dow, from, count) {
  const out = [];
  let t = new Date(Math.ceil(from.getTime() / 60000) * 60000 + 60000); // next whole minute
  while (out.length < count && t < new Date(from.getTime() + 366 * 864e5)) {
    if (mon.has(t.getMonth() + 1) &&
        dom.has(t.getDate()) && dow.has(t.getDay()) &&
        hour.has(t.getHours()) && minute.has(t.getMinutes())) {
      // dom/dow: standard cron = OR when both restricted
      const domStar = dom.size === 31, dowStar = dow.size === 7;
      if (domStar || dowStar || dom.has(t.getDate()) || dow.has(t.getDay())) {
        out.push(new Date(t));
        t = new Date(t.getTime() + 60000 * (60 - t.getMinutes() - 1 + 1)); // skip to next hour approx
        t.setMinutes(59); t = new Date(t.getTime() + 60000);
      } else t = new Date(t.getTime() + 60000);
    } else t = new Date(t.getTime() + 60000);
  }
  return out;
}
function routeCron(u, res, json) {
  const p = u.searchParams;
  const expr = (p.get('expr') || '').trim();
  if (!expr) return json(res, 200, { usage: '?expr=*/5 * * * * — parse cron, get human explanation and next runs. &runs=5 for count. Supports @daily etc.' });
  const raw = ALIASES[expr.toLowerCase()] || expr;
  const fields = raw.split(/\s+/);
  if (fields.length !== 5) return json(res, 400, { error: 'need exactly 5 fields: minute hour dom month dow' });
  try {
    const minute = parseField(fields[0], 0, 59);
    const hour = parseField(fields[1], 0, 23);
    const dom = parseField(fields[2], 1, 31);
    const mon = parseField(fields[3], 1, 12, MONTHS);
    const dow = parseField(fields[4], 0, 7, DAYS, true);
    const runs = Math.min(parseInt(p.get('runs') || '3', 10) || 3, 10);
    const next = nextRuns(minute, hour, dom, mon, dow, new Date(), runs).map(d => d.toISOString());
    return json(res, 200, { expression: raw, valid: true, next_runs: next });
  } catch (e) { return json(res, 400, { expression: expr, valid: false, error: String(e) }); }
}
module.exports = { routeCron };
