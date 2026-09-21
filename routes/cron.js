// /cron?expr=0 9 * * 1-5 → parse + human explanation + next 3 run times (UTC)
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MACROS = { '@yearly': '0 0 1 1 *', '@annually': '0 0 1 1 *', '@monthly': '0 0 1 * *', '@weekly': '0 0 * * 0', '@daily': '0 0 * * *', '@midnight': '0 0 * * *', '@hourly': '0 * * * *' };

function parseField(field, min, max) {
  // returns array of allowed values or null on error
  const vals = new Set();
  for (const part of field.split(',')) {
    const m = part.match(/^(\*|\d+(?:-\d+)?)(?:\/(\d+))?$/) || part.match(/^(\d+)-(\d+)(?:\/(\d+))?$/);
    let base, step = null;
    if (part === '*') { base = [min, max]; }
    else if (/^\d+$/.test(part)) { base = [+part, +part]; }
    else if (/^\*\/(\d+)$/.test(part)) { base = [min, max]; step = +RegExp.$1; }
    else {
      const mm = part.match(/^(\d+)-(\d+)(?:\/(\d+))?$/);
      if (!mm) return null;
      base = [+mm[1], +mm[2]];
      if (mm[3]) step = +mm[3];
    }
    let [a, b] = base;
    if (a < min || b > max || a > b) return null;
    if (step === null) step = 1;
    for (let v = a; v <= b; v += step) vals.add(v);
  }
  return [...vals].sort((x, y) => x - y);
}

function explain(expr) {
  const e = MACROS[expr] || expr;
  const f = e.trim().split(/\s+/);
  if (f.length !== 5) return { error: 'must be 5 fields: minute hour day-of-month month day-of-week' };
  const mins = parseField(f[0], 0, 59);
  const hours = parseField(f[1], 0, 23);
  const doms = parseField(f[2], 1, 31);
  const months = parseField(f[3], 1, 12);
  const dows = parseField(f[4], 0, 7);
  if (!mins || !hours || !doms || !months || !dows) return { error: 'field out of range or unparseable' };
  const dowsN = [...new Set(dows.map(d => d % 7))].sort((a, b) => a - b); // 7==0==Sun
  return { expanded: e, minutes: mins, hours, daysOfMonth: doms, months: months.map(m => MONTHS[m-1]), daysOfWeek: dowsN.map(d => DAYS[d]) };
}

function nextRuns(mins, hours, doms, months, dows, count) {
  const out = [];
  let t = new Date();
  t.setSeconds(0, 0);
  t.setMinutes(t.getMinutes() + 1);
  const mset = new Set(mins), hset = new Set(hours), dset = new Set(doms), moset = new Set(months), wset = new Set(dows.map(d => d % 7));
  for (let guard = 0; out.length < count && guard < 400000; guard++) {
    if (moset.has(t.getUTCMonth() + 1) && dset.has(t.getUTCDate()) && wset.has(t.getUTCDay()) && hset.has(t.getUTCHours()) && mset.has(t.getUTCMinutes())) {
      out.push(t.toISOString().replace('T', ' ').slice(0, 16) + ' UTC');
      t = new Date(t.getTime() + 60000);
    } else {
      // advance smartly
      if (!moset.has(t.getUTCMonth() + 1)) { t.setUTCMonth(t.getUTCMonth() + 1, 1); t.setUTCHours(0, 0); continue; }
      if (!dset.has(t.getUTCDate()) || !wset.has(t.getUTCDay())) { t.setUTCDate(t.getUTCDate() + 1); t.setUTCHours(0, 0); continue; }
      if (!hset.has(t.getUTCHours())) { t.setUTCHours(t.getUTCHours() + 1, 0); continue; }
      t.setUTCMinutes(t.getUTCMinutes() + 1);
    }
  }
  return out;
}

function routeCron(u, res, json) {
  const expr = u.searchParams.get('expr') || u.searchParams.get('expression');
  if (!expr) return json(res, 400, { error: 'pass expr=<cron expression>', example: '/cron?expr=0 9 * * 1-5', macros: Object.keys(MACROS) });
  const p = explain(expr);
  if (p.error) return json(res, 400, p);
  const dowsNum = p.daysOfWeek.map(d => DAYS.indexOf(d));
  const next = nextRuns(p.minutes, p.hours, p.daysOfMonth, p.months.map(m => MONTHS.indexOf(m) + 1), dowsNum, 3);
  return json(res, 200, { expression: expr, ...p, nextRuns: next, timezone: 'UTC' });
}
module.exports = { routeCron };
