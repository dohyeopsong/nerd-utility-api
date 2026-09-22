// /cron — parse cron expressions, describe them, compute next runs (5-field)
const MONTHS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
const DAYS = ['sun','mon','tue','wed','thu','fri','sat'];
function parseField(expr, min, max, names) {
  const values = new Set();
  for (const part of expr.split(',')) {
    let [rng, stepRaw] = part.split('/');
    const step = stepRaw ? +stepRaw : 1;
    let start = min, end = max;
    if (rng !== '*' && rng !== '') {
      if (rng.includes('-')) {
        const [a, b] = rng.split('-');
        start = norm(a); end = norm(b);
      } else {
        start = norm(rng);
        end = stepRaw ? max : start; // "5" alone = just 5; "5/2" = 5..max step 2
      }
    }
    for (let v = start; v <= end; v += step) values.add(v);
  }
  return values;
  function norm(x) {
    const s = x.toLowerCase();
    if (names) {
      const i = names.indexOf(s);
      if (i >= 0) return i + (names === DAYS ? 0 : 1); // months are 1-based
    }
    const n = +x;
    if (isNaN(n)) throw new Error(`invalid value: ${x}`);
    if (n < min || n > max) throw new Error(`value ${n} out of range ${min}-${max}`);
    return n;
  }
}
function describe(fields) {
  const [m, h, dom, mon, dow] = fields;
  const parts = [];
  parts.push(fieldDesc(m, 60, 'minute', 'every minute'));
  parts.push(fieldDesc(h, 24, 'hour', ''));
  return parts.join(', ');
}
function fieldDesc(set, max, unit, everyTxt) {
  if (set.size === max && max !== 60) return `every ${unit}`;
  return `${unit}: ${[...set].sort((a,b)=>a-b).join(',')}`;
}
function nextRuns(fields, count) {
  const [minF, hF, domF, monF, dowF] = fields;
  const runs = [];
  let d = new Date();
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() + 1);
  while (runs.length < count) {
    if (d.getTime() > Date.now() + 366 * 864e5) break; // 1y cap
    if (monF.has(d.getMonth() + 1) &&
        domF.has(d.getDate()) &&
        dowF.has(d.getDay()) &&
        hF.has(d.getHours()) &&
        minF.has(d.getMinutes())) {
      runs.push(new Date(d).toISOString());
      d.setMinutes(d.getMinutes() + 1);
      // advance past this minute
      continue;
    }
    d.setMinutes(d.getMinutes() + 1);
  }
  return runs;
}
function routeCron(u, res, json) {
  const q = u.searchParams;
  const expr = (q.get('expr') || q.get('e') || '').trim();
  if (!expr) return json(res, 400, { error: 'expr required (5-field cron)' });
  const f = expr.split(/\s+/);
  if (f.length !== 5) return json(res, 400, { error: `expected 5 fields, got ${f.length}` });
  let fields;
  try {
    fields = [
      parseField(f[0], 0, 59),
      parseField(f[1], 0, 23),
      parseField(f[2], 1, 31),
      parseField(f[3], 1, 12, MONTHS),
      parseField(f[4], 0, 6, DAYS)
    ];
  } catch (e) { return json(res, 400, { error: e.message }); }
  const count = Math.min(Math.max(+(q.get('count') || 3), 1), 10);
  return json(res, 200, {
    expr, valid: true,
    description: {
      minute: [...fields[0]].sort((a,b)=>a-b),
      hour: [...fields[1]].sort((a,b)=>a-b),
      day_of_month: [...fields[2]].sort((a,b)=>a-b),
      month: [...fields[3]].sort((a,b)=>a-b),
      day_of_week: [...fields[4]].sort((a,b)=>a-b)
    },
    next_runs_utc: nextRuns(fields, count)
  });
}
module.exports = { routeCron };
