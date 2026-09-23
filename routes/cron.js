// /cron — validate cron expressions, describe them, and compute next run times (5-field standard cron)
const ALIAS = { '@yearly': '0 0 1 1 *', '@annually': '0 0 1 1 *', '@monthly': '0 0 1 * *', '@weekly': '0 0 * * 0', '@daily': '0 0 * * *', '@midnight': '0 0 * * *', '@hourly': '0 * * * *' };
function parseField(spec, min, max, names) {
  const out = new Set();
  for (const part of spec.split(',')) {
    let step = 1, range = part;
    const sm = part.match(/^(.+)\/(\d+)$/);
    if (sm) { range = sm[1]; step = +sm[2]; if (step < 1) throw new Error('invalid step'); }
    let lo, hi;
    if (range === '*') { lo = min; hi = max; }
    else {
      const rm = range.match(/^([0-7A-Za-z*]+)-([0-7A-Za-z*]+)$/);
      if (rm) {
        lo = names[rm[1].toLowerCase()] ?? +rm[1];
        hi = names[rm[2].toLowerCase()] ?? +rm[2];
        if (rm[1] === '*') lo = min; if (rm[2] === '*') hi = max;
      } else {
        lo = hi = names[range.toLowerCase()] ?? +range;
      }
    }
    if (isNaN(lo) || isNaN(hi) || lo < min || hi > max || lo > hi) throw new Error(`invalid value "${part}"`);
    for (let v = lo; v <= hi; v += step) out.add(v % (max + 1));
  }
  return out;
}
const DOW = { sun:0, mon:1, tue:2, wed:3, thu:4, fri:5, sat:6 };
const MON = { jan:1, feb:2, mar:3, apr:4, may:5, jun:6, jul:7, aug:8, sep:9, oct:10, nov:11, dec:12 };
function parseCron(expr) {
  expr = expr.trim().replace(/\s+/g, ' ');
  if (ALIAS[expr]) expr = ALIAS[expr];
  const f = expr.split(' ');
  if (f.length !== 5) throw new Error('need exactly 5 fields: min hour dom month dow');
  return {
    minute: parseField(f[0], 0, 59),
    hour: parseField(f[1], 0, 23),
    dom: parseField(f[2], 1, 31),
    month: parseField(f[3], 1, 12, MON),
    dow: parseField(f[4], 0, 6, DOW),
  };
}
function next(c, from) {
  const t = new Date(from); t.setSeconds(0, 0); t.setMinutes(t.getMinutes() + 1);
  for (let i = 0; i < 366 * 24 * 60 * 4; i++) {
    if (t.getMonth() + 1 !== +[...Array(13).keys()].slice(1).find(m => c.month.has(m)) && !c.month.has(t.getMonth() + 1)) { t.setMonth(t.getMonth() + 1, 1); t.setHours(0, 0, 0, 0); continue; }
    if (!c.month.has(t.getMonth() + 1)) { t.setMonth(t.getMonth() + 1, 1); t.setHours(0, 0, 0, 0); continue; }
    if (!c.dom.has(t.getDate()) && !c.dowRestricted(t)) { /* fallthrough */ }
    // standard cron: if both dom and dow are restricted, match either; else match both
    const domOk = c.dom.has(t.getDate());
    const dowOk = c.dow.has(t.getDay());
    const bothRestricted = c.domIsRestricted && c.dowIsRestricted;
    const dayOk = bothRestricted ? (domOk || dowOk) : (domOk && dowOk);
    if (!c.month.has(t.getMonth() + 1) || !dayOk) {
      t.setDate(t.getDate() + 1); t.setHours(0, 0, 0, 0); continue;
    }
    if (!c.hour.has(t.getHours())) { t.setHours(t.getHours() + 1, 0, 0, 0); continue; }
    if (!c.minute.has(t.getMinutes())) { t.setMinutes(t.getMinutes() + 1); continue; }
    return t;
  }
  return null;
}
function routeCron(u, res, json) {
  const p = u.searchParams;
  let expr = p.get('expr') || p.get('c');
  const count = Math.min(+(p.get('count') || 1), 10);
  const from = p.get('from') ? new Date(p.get('from')) : new Date();
  if (!expr) return json(res, 200, { usage: '?expr=*/15 * * * * [&count=3] [&from=ISO] — validate + next runs. Supports aliases @daily etc.' });
  try {
    const c = parseCron(expr);
    // restricted flags: field != '*'
    const raw = (ALIAS[expr] || expr).replace(/\s+/g, ' ').split(' ');
    c.domIsRestricted = raw[2] !== '*';
    c.dowIsRestricted = raw[4] !== '*';
    const runs = [];
    let t = from;
    for (let i = 0; i < count; i++) {
      t = next(c, t);
      if (!t) break;
      runs.push(t.toISOString());
    }
    return json(res, 200, { expr, valid: true, next_runs: runs, from: from.toISOString() });
  } catch (e) {
    return json(res, 400, { expr, valid: false, error: e.message });
  }
}
module.exports = { routeCron };
