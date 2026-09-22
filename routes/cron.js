// /cron — parse cron expression, describe it, compute next N runs
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DOW = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const ALIASES = {
  '@yearly': '0 0 1 1 *', '@annually': '0 0 1 1 *', '@monthly': '0 0 1 * *',
  '@weekly': '0 0 * * 0', '@daily': '0 0 * * *', '@midnight': '0 0 * * *', '@hourly': '0 * * * *'
};
function expandField(field, min, max, names) {
  // returns Set of allowed ints, or null on error
  const out = new Set();
  for (const part of field.split(',')) {
    let step = 1, range = part;
    const sm = part.match(/^(.*)\/(\d+)$/);
    if (sm) { range = sm[1]; step = +sm[2]; if (step < 1) return null; }
    let lo, hi;
    if (range === '*') { lo = min; hi = max; }
    else {
      const rm = range.match(/^([A-Za-z0-9]+)(?:-([A-Za-z0-9]+))?$/);
      if (!rm) return null;
      lo = parseVal(rm[1], min, max, names); if (lo === null) return null;
      hi = rm[2] !== undefined ? parseVal(rm[2], min, max, names) : (sm ? max : lo);
      if (hi === null) return null;
    }
    if (lo > hi) { // wrap-around range e.g. 5-1
      for (let i = lo; i <= max; i += step) out.add(i);
      for (let i = min; i <= hi; i += step) out.add(i);
      continue;
    }
    for (let i = lo; i <= hi; i += step) out.add(i);
  }
  return out;
}
function parseVal(s, min, max, names) {
  if (/^\d+$/.test(s)) { const v = +s; return v >= min && v <= max ? v : null; }
  if (names) {
    const i = names.findIndex(n => n.toLowerCase() === s.toLowerCase());
    if (i >= 0) return i;
  }
  return null;
}
function routeCron(u, res, json) {
  const q = u.searchParams;
  const expr = (q.get('expr') || q.get('cron') || '').trim();
  const count = Math.min(Math.max(parseInt(q.get('count') || '3'), 1), 25);
  if (!expr) return json(res, 400, { error: 'expr required (5-field cron expression)' });
  const full = ALIASES[expr.toLowerCase()] || expr;
  const fields = full.split(/\s+/);
  if (fields.length !== 5) return json(res, 400, { error: 'expected 5 fields: minute hour day-of-month month day-of-week' });
  const [fMin, fHour, fDom, fMon, fDow] = fields;
  const mins = expandField(fMin, 0, 59), hours = expandField(fHour, 0, 23);
  const doms = expandField(fDom, 1, 31), mons = expandField(fMon, 1, 12, MONTHS), dows = expandField(fDow, 0, 7, DOW);
  if (dows) dows.has(7) && dows.add(0); // 7 == Sunday == 0
  if (!mins || !hours || !doms || !mons || !dows)
    return json(res, 400, { error: 'invalid field in expression' });
  // compute next runs
  const next = [];
  let d = new Date();
  d.setSeconds(0, 0); d.setMinutes(d.getMinutes() + 1);
  const domRestricted = fDom !== '*', dowRestricted = fDow !== '*';
  outer: for (let iter = 0; iter < 50000 && next.length < count; iter++) {
    if (!mons.has(d.getMonth() + 1)) { d = new Date(d.getFullYear(), d.getMonth() + 1, 1); continue; }
    const domOk = doms.has(d.getDate());
    const dowOk = dows.has(d.getDay());
    // cron DOM/DOW rule: if both restricted, match either; else match both
    const dayOk = domRestricted && dowRestricted ? (domOk || dowOk) : (domOk && dowOk);
    if (!dayOk) { d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0); continue; }
    if (!hours.has(d.getHours())) { d.setHours(d.getHours() + 1, 0, 0); continue; }
    if (!mins.has(d.getMinutes())) { d.setMinutes(d.getMinutes() + 1, 0); continue; }
    next.push(new Date(d));
    d.setMinutes(d.getMinutes() + 1);
  }
  if (next.length < count) return json(res, 400, { error: 'could not compute next runs (expression may never fire)' });
  return json(res, 200, {
    expression: expr, expanded: full,
    minute: fMin, hour: fHour, day_of_month: fDom, month: fMon, day_of_week: fDow,
    next_runs: next.map(d => d.toISOString())
  });
}
module.exports = { routeCron };
