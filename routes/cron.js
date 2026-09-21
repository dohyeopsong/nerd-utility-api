// Cron expression explainer: 5-field parse + next-run computation
const ALIASES = {
  '@yearly': '0 0 1 1 *', '@annually': '0 0 1 1 *', '@monthly': '0 0 1 * *',
  '@weekly': '0 0 * * 0', '@daily': '0 0 * * *', '@midnight': '0 0 * * *', '@hourly': '0 * * * *'
};
const FIELDS = [
  { name: 'minute', min: 0, max: 59 }, { name: 'hour', min: 0, max: 23 },
  { name: 'day-of-month', min: 1, max: 31 }, { name: 'month', min: 1, max: 12 },
  { name: 'day-of-week', min: 0, max: 7 } // 0 and 7 = Sunday
];
function parseField(expr, f) {
  const out = new Set();
  for (const part of expr.split(',')) {
    const [range, step] = part.split('/');
    const stepN = step ? parseInt(step, 10) : 1;
    if (!Number.isInteger(stepN) || stepN < 1) throw new Error(`invalid step in ${f.name}: "${part}"`);
    let lo = f.min, hi = f.max;
    if (range !== '*') {
      if (range.includes('-')) {
        const [a, b] = range.split('-').map(n => parseInt(n, 10));
        if (!Number.isInteger(a) || !Number.isInteger(b)) throw new Error(`invalid range in ${f.name}: "${part}"`);
        lo = a; hi = b;
      } else {
        const v = parseInt(range, 10);
        if (!Number.isInteger(v)) throw new Error(`invalid value in ${f.name}: "${part}"`);
        lo = v; hi = step ? v : v; // N/step = N-max/step
        if (step) hi = f.max;
      }
    }
    if (lo < f.min || hi > f.max || lo > hi) throw new Error(`out of range in ${f.name}: "${part}"`);
    for (let v = lo; v <= hi; v += stepN) out.add(f.name === 'day-of-week' && v === 7 ? 0 : v);
  }
  return out;
}
function parseCron(expr) {
  let e = String(expr || '').trim().toLowerCase();
  if (ALIASES[e]) e = ALIASES[e];
  if (e.startsWith('@')) throw new Error(`unknown alias: ${e}`);
  const fields = e.split(/\s+/);
  if (fields.length !== 5) throw new Error(`expected 5 fields, got ${fields.length}`);
  return FIELDS.map((f, i) => parseField(fields[i], f));
}
function describe(sets) {
  const [min, hr, dom, mon, dow] = sets;
  const s = n => n.size === 1 ? [...n][0] : `${Math.min(...n)}-${Math.max(...n)}`;
  const parts = [];
  parts.push(min.size === 60 ? 'every minute' : `at minute ${s(min)} past`);
  parts.push(hr.size === 24 ? 'every hour' : `hour ${s(hr)}`);
  parts.push(dom.size === 31 ? 'every day' : `day ${s(dom)} of`);
  parts.push(mon.size === 12 ? 'every month' : `month ${s(mon)}`);
  parts.push(dow.size === 8 || (dow.size === 7 && !dow.has(0) && [1,2,3,4,5,6].every(d=>dow.has(d)) ? false : false) ? 'every day of week' : `weekday(s) ${s(dow)}`);
  return parts.join(' ');
}
function nextRuns(sets, from, count) {
  const [min, hr, dom, mon, dow] = sets;
  const runs = [];
  let d = new Date(Math.ceil(from.getTime() / 60000) * 60000); // round up to next minute
  d.setSeconds(0, 0);
  d = new Date(d.getTime() + 60000); // start from next minute boundary after 'from'
  const limit = new Date(from.getTime() + 366 * 24 * 3600 * 1000);
  while (runs.length < count && d < limit) {
    if (mon.has(d.getMonth() + 1) && dom.has(d.getDate()) && dow.has(d.getDay()) && hr.has(d.getHours()) && min.has(d.getMinutes())) {
      runs.push(new Date(d));
      d = new Date(d.getTime() + 60000);
    } else {
      d = new Date(d.getTime() + 60000);
    }
  }
  return runs;
}
function routeCron(u, res, json) {
  const q = Object.fromEntries(new URL(u, 'http://x').searchParams);
  if (!q.expr) return json(res, 400, { error: 'missing ?expr=<cron expression>' });
  try {
    const sets = parseCron(q.expr);
    const count = Math.min(parseInt(q.count || '3', 10) || 3, 10);
    const from = q.from ? new Date(q.from) : new Date();
    if (isNaN(from)) return json(res, 400, { error: 'invalid ?from= date' });
    return json(res, 200, {
      expression: q.expr, normalized: q.expr.trim().toLowerCase(), description: describe(sets),
      nextRuns: nextRuns(sets, from, count).map(d => d.toISOString())
    });
  } catch (e) {
    return json(res, 400, { error: e.message });
  }
}
module.exports = { routeCron, parseCron, nextRuns, describe };
