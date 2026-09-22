// routes/cron.js — cron expression parser + next-run calculator
// GET /cron?expr=0 30 9 * * MON-FRI
const DAY_NAMES = { SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 };

function parseField(field, min, max, isDow) {
  if (field === '*') return null; // all
  const values = new Set();
  for (const part of field.split(',')) {
    let step = 1, range = part;
    const slash = part.split('/');
    if (slash.length === 2) { step = parseInt(slash[1], 10); range = slash[0]; }
    let start, end;
    if (range === '*') { start = min; end = max; }
    else if (range.includes('-')) { const [a, b] = range.split('-'); start = nameToNum(a, isDow); end = nameToNum(b, isDow); }
    else { start = end = nameToNum(range, isDow); }
    if (step <= 0 || Number.isNaN(start) || Number.isNaN(end) || start < min || end > max || start > end)
      throw new Error(`invalid field '${field}' (range ${min}-${max})`);
    for (let v = start; v <= end; v += step) values.add(v);
  }
  return values;
}
function nameToNum(s, isDow) {
  s = String(s).toUpperCase();
  if (isDow && s in DAY_NAMES) return DAY_NAMES[s];
  if (isDow && s.startsWith('SUN') === false && /^[A-Z]{3}$/.test(s)) {
    if (s in DAY_NAMES) return DAY_NAMES[s];
  }
  const n = parseInt(s, 10);
  if (Number.isNaN(n)) {
    if (isDow && DAY_NAMES[s] !== undefined) return DAY_NAMES[s];
    if (/^[A-Z]{3}$/.test(s) && DAY_NAMES[s] !== undefined) return DAY_NAMES[s];
    throw new Error(`cannot parse '${s}'`);
  }
  return n;
}

function routeCron(u, res, json) {
  const expr = u.searchParams.get('expr');
  if (!expr) return json(res, 400, { error: 'expr required, e.g. ?expr=' + encodeURIComponent('0 30 9 * * MON-FRI') });
  const fields = expr.trim().split(/\s+/);
  if (fields.length !== 5) return json(res, 400, { error: 'expected 5 fields: min hour dom month dow' });
  let mins, hrs, doms, mons, dows;
  try {
    mins = parseField(fields[0], 0, 59, false);
    hrs = parseField(fields[1], 0, 23, false);
    doms = parseField(fields[2], 1, 31, false);
    mons = parseField(fields[3], 1, 12, false);
    dows = parseField(fields[4], 0, 7, true);
    if (dows) dows.delete(7); if (dows && dows.size === 0) dows = null; // 7==SUN
  } catch (e) { return json(res, 400, { error: e.message }); }
  const human = describe(mins, hrs, doms, mons, dows);
  // next 5 runs from now
  const now = new Date();
  const runs = [];
  let d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  d.setMinutes(d.getMinutes() + 1);
  let guard = 0;
  while (runs.length < 5 && guard++ < 366 * 24 * 60) {
    if ((!mins || mins.has(d.getMinutes())) && (!hrs || hrs.has(d.getHours())) &&
        (!mons || mons.has(d.getMonth() + 1)) && (!doms || doms.has(d.getDate())) &&
        (!dows || dows.has(d.getDay()))) {
      runs.push(d.toISOString());
      d = new Date(d.getTime() + 60000); d.setSeconds(0, 0);
    } else {
      d = new Date(d.getTime() + 60000);
    }
  }
  return json(res, 200, { expr, valid: true, description: human, nextRuns: runs });
}
function describe(mins, hrs, doms, mons, dows) {
  const s = (set, all, name) => set ? `${[...set].join(',') || 'none'} ${name}` : `every ${name}`;
  return [s(mins, 60, 'minute'), s(hrs, 24, 'hour'), s(doms, 31, 'day-of-month'), s(mons, 12, 'month'), s(dows, 7, 'day-of-week')].join(', ');
}
module.exports = { routeCron };
