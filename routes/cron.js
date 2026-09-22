// Cron expression parser: /cron?expr=*/5 9-17 * * 1-5 — validate + next N runs
// /cron?expr=...&runs=5&from=ISO — next run times (5-field cron, standard syntax)
function parseField(field, min, max, names) {
  const vals = new Set();
  if (field === '*') { for (let i = min; i <= max; i++) vals.add(i); return vals; }
  for (const part of field.split(',')) {
    let m = part.match(/^(\*|\d+|\w+)(?:\/(\d+))?(?:-(\d+|\w+))?$/);
    if (part.includes('-')) {
      m = part.match(/^(\*|\d+|\w+)-(\d+|\w+)(?:\/(\d+))?$/);
      if (!m) return null;
      let a = names ? (names[m[1].toUpperCase()] ?? +m[1]) : +m[1];
      let b = names ? (names[m[2].toUpperCase()] ?? +m[2]) : +m[2];
      if (isNaN(a) || isNaN(b) || a < min || b > max || a > b) return null;
      const step = m[3] ? +m[3] : 1;
      for (let i = a; i <= b; i += step) vals.add(i);
    } else if (m && m[2]) { // step only
      if (m[1] !== '*') return null;
      const step = +m[2];
      if (step < 1) return null;
      for (let i = min; i <= max; i += step) vals.add(i);
    } else {
      let v = names ? (names[part.toUpperCase()] ?? +part) : +part;
      if (isNaN(v) || v < min || v > max) return null;
      vals.add(v);
    }
  }
  return vals.size ? vals : null;
}
const MONTHS = { JAN:1,FEB:2,MAR:3,APR:4,MAY:5,JUN:6,JUL:7,AUG:8,SEP:9,OCT:10,NOV:11,DEC:12 };
const DAYS = { SUN:0,MON:1,TUE:2,WED:3,THU:4,FRI:5,SAT:6 };
function parseCron(expr) {
  const f = expr.trim().split(/\s+/);
  if (f.length !== 5) return null;
  const [min, hour, dom, mon, dow] = [
    parseField(f[0], 0, 59), parseField(f[1], 0, 23),
    parseField(f[2], 1, 31), parseField(f[3], 1, 12, MONTHS), parseField(f[4], 0, 6, DAYS)
  ];
  if (!min || !hour || !dom || !mon || !dow) return null;
  return { min, hour, dom, mon, dow, domRestricted: f[2] !== '*', dowRestricted: f[4] !== '*' };
}
function nextRuns(parsed, from, count) {
  const runs = [];
  const t = new Date(from);
  t.setSeconds(0, 0);
  t.setMinutes(t.getMinutes() + 1);
  while (runs.length < count && t.getTime() < from.getTime() + 366 * 86400000) {
    const ok = parsed.mon.has(t.getMonth() + 1) && parsed.hour.has(t.getHours()) && parsed.min.has(t.getMinutes());
    const dayOk = parsed.dom.has(t.getDate()) && parsed.dow.has(t.getDay());
    const dayOkVixie = parsed.domRestricted && parsed.dowRestricted ? (parsed.dom.has(t.getDate()) || parsed.dow.has(t.getDay())) : dayOk;
    if (ok && dayOkVixie) runs.push(new Date(t).toISOString());
    t.setMinutes(t.getMinutes() + 1);
  }
  return runs;
}
async function routeCron(u, res, json) {
  const expr = u.searchParams.get('expr') || u.searchParams.get('expression');
  if (!expr) return json(res, 400, { error: 'provide ?expr="*/5 9-17 * * 1-5"' });
  const parsed = parseCron(expr);
  if (!parsed) return json(res, 400, { error: 'invalid cron expression (5 fields: min hour dom mon dow)' });
  const runs = +u.searchParams.get('runs') || 3;
  const from = u.searchParams.get('from') ? new Date(u.searchParams.get('from')) : new Date();
  if (isNaN(from)) return json(res, 400, { error: 'invalid ?from date' });
  const next = nextRuns(parsed, from, Math.min(runs, 10));
  return json(res, 200, {
    valid: true, expression: expr,
    semantics: `${next.length ? 'runs next at ' + next[0] : 'no runs in next year'}`,
    nextRuns: next, requestedFrom: from.toISOString()
  });
}
module.exports = { routeCron };
