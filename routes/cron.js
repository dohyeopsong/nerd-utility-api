// /cron — parse cron expression, describe in English, compute next run times
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DOWS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
function routeCron(u, res, json) {
  const expr = u.searchParams.get('expr');
  if (!expr) return json(res, 200, { usage: '?expr="0 9 * * 1-5" — parses 5-field cron, explains it, lists next runs (from=timestamp or now)' });
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return json(res, 400, { error: `cron needs 5 fields (minute hour dom month dow), got ${parts.length}` });
  const aliases = { '@yearly':'0 0 1 1 *', '@annually':'0 0 1 1 *', '@monthly':'0 0 1 * *', '@weekly':'0 0 * * 0', '@daily':'0 0 * * *', '@midnight':'0 0 * * *', '@hourly':'0 * * * *' };
  // field parse: returns null if '*'
  const parseField = (s, min, max, names) => {
    if (s === '*') return null;
    const vals = new Set();
    for (const piece of s.split(',')) {
      let step = 1, range = piece;
      const sm = piece.match(/^(.*)\/(\d+)$/);
      if (sm) { range = sm[1]; step = parseInt(sm[2]); }
      let [a, b] = range.split('-').map(x => {
        if (/^\d+$/.test(x)) return parseInt(x);
        const idx = names ? names.findIndex(n => n.toLowerCase().startsWith(x.toLowerCase()) && x.length >= 3) : -1;
        return idx;
      });
      if (a === undefined || isNaN(a)) return 'ERR';
      if (b === undefined) b = a;
      if (isNaN(b)) return 'ERR';
      if (a < min || b > max || a > b) return 'ERR';
      for (let v = a; v <= b; v += step) vals.add(v);
    }
    return vals;
  };
  let e = expr;
  if (aliases[expr]) e = aliases[expr];
  const f = e.trim().split(/\s+/);
  const minute = parseField(f[0], 0, 59), hour = parseField(f[1], 0, 23), dom = parseField(f[2], 1, 31), month = parseField(f[3], 1, 12, MONTHS), dow = parseField(f[4], 0, 7, DOWS);
  if (dow === 'ERR' || minute === 'ERR' || hour === 'ERR' || dom === 'ERR' || month === 'ERR') return json(res, 400, { error: 'invalid field value or out-of-range' });
  if (dow && dow.has(7)) { dow.delete(7); dow.add(0); }
  const fieldStr = (v, names, offset = 0) => !v ? 'every' : [...v].map(n => names ? names[n] || n : n + offset).join(', ');
  const describe = `At minute ${fieldStr(minute)}, hour ${fieldStr(hour)}, day-of-month ${fieldStr(dom)}, during ${fieldStr(month, MONTHS.slice(1)) || 'every month'}, on ${fieldStr(dow, DOWS) || 'every day-of-week'}`;
  // next 3 runs: brute force scan
  const from = u.searchParams.get('from') ? new Date(Number(u.searchParams.get('from')) * 1000 || u.searchParams.get('from')) : new Date();
  from.setSeconds(0, 0); from.setMinutes(from.getMinutes() + 1);
  const next = [];
  const d = new Date(from);
  for (let i = 0; i < 527040 && next.length < 3; i++) { // scan up to 1 year of minutes
    if ((!minute || minute.has(d.getMinutes())) && (!hour || hour.has(d.getHours())) && (!month || month.has(d.getMonth() + 1)) &&
        (!dom || dom.has(d.getDate())) && (!dow || dow.has(d.getDay())) &&
        (!dom === !dow || (dom && dow) || true)) {
      // cron rule: if both dom and dow are restricted, match either
      const domOk = !dom || dom.has(d.getDate());
      const dowOk = !dow || dow.has(d.getDay());
      const bothRestricted = dom && dow;
      if (bothRestricted ? (domOk || dowOk) : (domOk && dowOk)) next.push(new Date(d));
    }
    d.setMinutes(d.getMinutes() + 1);
  }
  return json(res, 200, {
    expression: expr,
    expanded: e,
    description: describe,
    next_runs: next.map(x => x.toISOString()),
    from: from.toISOString(),
  });
}
module.exports = { routeCron };
