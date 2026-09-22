// /cron — validate cron expressions, preview next runs (5-field standard syntax)
const MONTHS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
const DAYS = ['sun','mon','tue','wed','thu','fri','sat'];

function parseField(spec, min, max, names) {
  const vals = new Set();
  for (const part of spec.split(',')) {
    let step = 1, range = part;
    const si = part.indexOf('/');
    if (si !== -1) { step = Number(part.slice(si + 1)); range = part.slice(0, si); if (!Number.isInteger(step) || step < 1) throw new Error(`bad step in "${part}"`); }
    let lo = min, hi = max;
    if (range === '*') { /* full range */ }
    else {
      const m = range.match(/^(\w+)-(\w+)$/);
      if (m) {
        lo = num(m[1], names); hi = num(m[2], names);
        if (lo === null || hi === null || lo > hi) throw new Error(`bad range "${range}"`);
      } else {
        const v = num(range, names);
        if (v === null || (si !== -1 && false)) throw new Error(`bad value "${range}"`);
        if (v === null) throw new Error(`bad value "${range}"`);
        lo = hi = v;
      }
    }
    for (let i = lo; i <= hi; i += step) vals.add(i);
  }
  if (!vals.size) throw new Error('empty field');
  return [...vals].sort((a, b) => a - b);
}

function num(s, names) {
  const ls = s.toLowerCase();
  if (names) { const i = names.indexOf(ls); if (i !== -1) return i + (names === MONTHS ? 1 : 0); }
  if (/^\d+$/.test(s)) return Number(s);
  return null;
}

function matches(d, f) {
  const mins = d.getUTCMinutes(), hrs = d.getUTCHours(), dom = d.getUTCDate(), mon = d.getUTCMonth() + 1, dow = d.getUTCDay();
  return f[0].includes(mins) && f[1].includes(hrs) && f[2].includes(dom) && f[3].includes(mon) && f[4].includes(dow);
}

function routeCron(u, res, json) {
  const q = Object.fromEntries(u.searchParams.entries());
  const expr = q.expr || q.cron;
  if (!expr) throw new Error('provide ?expr=5-field cron (min hour dom mon dow)');
  const fields = expr.trim().split(/\s+/);
  if (fields.length !== 5) throw new Error(`expected 5 fields, got ${fields.length}`);
  let f;
  try {
    f = [
      parseField(fields[0], 0, 59),
      parseField(fields[1], 0, 23),
      parseField(fields[2], 1, 31),
      parseField(fields[3], 1, 12, MONTHS),
      parseField(fields[4], 0, 6, DAYS)
    ];
  } catch (e) { return json(res, 400, { valid: false, error: e.message }); }

  // Find next N runs (UTC), scan minute-by-minute from next minute
  const count = Math.min(Number(q.count) || 3, 10);
  const runs = [];
  const t = new Date(Math.ceil((Date.now() + 60000) / 60000) * 60000);
  const limit = new Date(t.getTime() + 366 * 24 * 3600 * 1000);
  while (runs.length < count && t < limit) {
    if (matches(t, f)) runs.push(t.toISOString().replace(':00.000Z', ':00Z'));
    t.setUTCMinutes(t.getUTCMinutes() + 1);
  }
  return json(res, 200, { valid: true, expression: expr, fields: { minute: f[0], hour: f[1], dayOfMonth: f[2], month: f[3], dayOfWeek: f[4] }, nextRuns: runs, timezone: 'UTC' });
}

module.exports = { routeCron };
