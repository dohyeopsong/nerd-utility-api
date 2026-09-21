// Cron expression parser: 5-field standard cron, next N run times, human-readable description
function parseField(expr, min, max, names) {
  const map = {}; const out = [];
  for (const part of expr.split(',')) {
    let step = 1, range = part;
    const si = part.indexOf('/');
    if (si >= 0) { step = parseInt(part.slice(si + 1), 10); range = part.slice(0, si); }
    let lo = min, hi = max;
    if (range !== '*' && range !== '') {
      const d = range.split('-');
      lo = names && names[d[0].toLowerCase()] !== undefined ? names[d[0].toLowerCase()] : parseInt(d[0], 10);
      hi = d.length > 1 ? (names && names[d[1].toLowerCase()] !== undefined ? names[d[1].toLowerCase()] : parseInt(d[1], 10)) : (si >= 0 ? max : lo);
    }
    if (isNaN(lo) || isNaN(hi) || lo < min || hi > max || lo > hi || step < 1) return null;
    for (let v = lo; v <= hi; v += step) out.push(v);
  }
  return out.sort((a, b) => a - b);
}
const DOW = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
const MON = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
function parseCron(expr) {
  const f = expr.trim().split(/\s+/);
  if (f.length !== 5) return null;
  const min = parseField(f[0], 0, 59); const hour = parseField(f[1], 0, 23);
  const dom = parseField(f[2], 1, 31); const mon = parseField(f[3], 0, 11, MON);
  let dow = parseField(f[4], 0, 6, DOW);
  if (!min || !hour || !dom || !mon || dow === null) return null;
  // cron quirk: if both dom and dow are restricted, they're OR'd (vixie cron). Here: if either is full-range, restrict only the other.
  const domFull = f[2] === '*'; const dowFull = f[4] === '*';
  return { min, hour, dom, mon, dow, domFull, dowFull };
}
function nextRuns(parsed, from, count) {
  const runs = [];
  let t = new Date(from.getTime());
  t.setSeconds(0, 0); t.setMinutes(t.getMinutes() + 1);
  const sets = {
    min: new Set(parsed.min), hour: new Set(parsed.hour),
    dom: new Set(parsed.dom), mon: new Set(parsed.mon), dow: new Set(parsed.dow)
  };
  while (runs.length < count) {
    if (t.getFullYear() > from.getFullYear() + 5) break;
    if (!sets.mon.has(t.getMonth())) { t.setMonth(t.getMonth() + 1, 1); t.setHours(0, 0, 0, 0); continue; }
    const dayMatch = parsed.domFull ? sets.dow.has(t.getDay()) : parsed.dowFull ? sets.dom.has(t.getDate())
      : (sets.dom.has(t.getDate()) || sets.dow.has(t.getDay())); // OR when both restricted
    if (!dayMatch) { t.setDate(t.getDate() + 1); t.setHours(0, 0, 0, 0); continue; }
    if (!sets.hour.has(t.getHours())) { t.setHours(t.getHours() + 1, 0, 0); continue; }
    if (!sets.min.has(t.getMinutes())) { t.setMinutes(t.getMinutes() + 1); continue; }
    runs.push(new Date(t));
    t.setMinutes(t.getMinutes() + 1);
  }
  return runs;
}
function describe(p) {
  const f = (s, names) => s.length > 8 ? s.slice(0, 8).join(',') + '…' : s.map(v => names ? names[v] : v).join(',');
  return `At ${p.min.length === 60 ? 'every minute' : 'minute ' + f(p.min)} past ${p.hour.length === 24 ? 'every hour' : 'hour ' + f(p.hour)}, on ${p.dom.length === 31 ? 'every day-of-month' : 'dom ' + f(p.dom)}, in ${p.mon.length === 12 ? 'every month' : 'month ' + f(p.mon, ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'])}, on ${p.dow.length === 7 ? 'every day-of-week' : f(p.dow, ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'])}`;
}
function routeCron(u, res, json) {
  const expr = u.searchParams.get('expr');
  if (!expr) return json(res, 400, { error: 'param: expr=cron expression (5 fields)' });
  const p = parseCron(expr);
  if (!p) return json(res, 400, { error: 'invalid cron expression (expected 5 fields: min hour dom mon dow)' });
  const n = Math.min(parseInt(u.searchParams.get('count') || '3', 10) || 3, 20);
  const runs = nextRuns(p, new Date(), n);
  return json(res, 200, {
    expression: expr,
    description: describe(p),
    nextRuns: runs.map(d => d.toISOString()),
    nextRun: runs[0] ? runs[0].toISOString() : null
  });
}
module.exports = { routeCron, parseCron, nextRuns };
