// /cron — parse cron expression: human-readable description + next N run times (5-field)
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function parseField(expr, min, max, names) {
  // returns sorted array of allowed values, or null on error
  const nameMap = {};
  if (names) names.forEach((n, i) => nameMap[n.toLowerCase()] = min + i);
  const vals = new Set();
  for (const part of expr.split(',')) {
    const m = part.match(/^(\*|\d+|[a-z]+)(?:\/(\d+))?(?:-(\d+|[a-z]+))?$/i);
    if (!m) return null;
    const norm = v => {
      if (/^\d+$/.test(v)) return parseInt(v, 10);
      const nv = nameMap[v.toLowerCase()];
      return nv !== undefined ? nv : null;
    };
    let step = m[2] ? parseInt(m[2], 10) : 1;
    if (!step || step < 1) return null;
    let lo, hi;
    if (m[1] === '*') { lo = min; hi = max; }
    else {
      lo = norm(m[1]);
      if (lo === null || lo < min || lo > max) return null;
      if (m[3] !== undefined) {
        hi = norm(m[3]);
        if (hi === null || hi < min || hi > max || hi < lo) return null;
      } else hi = m[2] !== undefined ? max : lo;
    }
    for (let v = lo; v <= hi; v += step) vals.add(v);
  }
  return [...vals].sort((a, b) => a - b);
}

function describe(fields) {
  const [min, hr, dom, mon, dow] = fields.map(f => f.join(','));
  const all = (arr, min, max) => arr.length === max - min + 1;
  let time;
  if (all(fields[0], 0, 59) && all(fields[1], 0, 23)) time = 'every minute';
  else if (fields[0].length === 1 && fields[1].length === 1) time = `at ${String(fields[1][0]).padStart(2,'0')}:${String(fields[0][0]).padStart(2,'0')}`;
  else if (all(fields[0], 0, 59)) time = `every minute of hour(s) ${fields[1].join(',')}`;
  else time = `at minute(s) ${fields[0].join(',')} of hour(s) ${fields[1].join(',')}`;
  let date = '';
  if (!all(fields[2], 1, 31) || !all(fields[3], 1, 12) || !all(fields[4], 0, 6)) {
    const bits = [];
    if (!all(fields[2], 1, 31)) bits.push(`on day-of-month ${fields[2].join(',')}`);
    if (!all(fields[3], 1, 12)) bits.push(`in ${fields[3].map(m => MONTHS[m-1]).join(',')}`);
    if (!all(fields[4], 0, 6)) bits.push(`on ${fields[4].map(d => DAYS[d]).join(',')}`);
    date = ' ' + bits.join(' ');
  }
  return time + date;
}

function nextRuns(fields, from, count) {
  const runs = [];
  const d = new Date(from);
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() + 1);
  const setMin = new Set(fields[0]), setHr = new Set(fields[1]), setDom = new Set(fields[2]),
        setMon = new Set(fields[3]), setDow = new Set(fields[4]);
  const domAll = setDom.size === 31, dowAll = setDow.size === 7;
  while (runs.length < count && d.getTime() < from.getTime() + 366 * 24 * 3600 * 1000) {
    if (!setMon.has(d.getMonth() + 1)) { d.setMonth(d.getMonth() + 1, 1); d.setHours(0, 0); continue; }
    const domOk = setDom.has(d.getDate());
    const dowOk = setDow.has(d.getDay());
    const dayOk = (domAll && dowAll) || (domOk && dowOk) || (domAll && dowOk) || (dowAll && domOk);
    if (!dayOk) { d.setDate(d.getDate() + 1); d.setHours(0, 0); continue; }
    if (!setHr.has(d.getHours())) { d.setHours(d.getHours() + 1, 0, 0); continue; }
    if (!setMin.has(d.getMinutes())) { d.setMinutes(d.getMinutes() + 1, 0); continue; }
    runs.push(new Date(d).toISOString());
    d.setMinutes(d.getMinutes() + 1);
  }
  return runs;
}

function routeCron(u, res, json) {
  const q = u.searchParams;
  const expr = q.get('expr') || q.get('cron') || '';
  const count = Math.min(parseInt(q.get('count') || '3', 10) || 3, 20);
  const fields = expr.trim().split(/\s+/);
  if (fields.length !== 5) return json(res, 400, { error: 'cron must have 5 fields (minute hour day-of-month month day-of-week)' });
  const names = [null, null, null, MONTHS, DAYS];
  const ranges = [[0, 59], [0, 23], [1, 31], [1, 12], [0, 6]];
  const parsed = fields.map((f, i) => parseField(f, ranges[i][0], ranges[i][1], names[i]));
  const bad = parsed.findIndex(p => p === null);
  if (bad !== -1) return json(res, 400, { error: `invalid field ${bad + 1} ("${fields[bad]}")` });
  const desc = describe(parsed);
  const runs = nextRuns(parsed, new Date(), count);
  return json(res, 200, { expression: expr, description: desc, next_runs: runs, next_run: runs[0] || null });
}
module.exports = { routeCron };
