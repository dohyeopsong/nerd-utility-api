// /cron — cron expression parse + next N run times
// supports: m h dom mon dow, */n, a-b, lists, names for month/dow
const MONTHS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
const DOWS = ['sun','mon','tue','wed','thu','fri','sat'];

function parseField(field, min, max, names) {
  if (field === '*') { const s = new Set(); for (let i = min; i <= max; i++) s.add(i); return s; }
  const out = new Set();
  for (const part of field.split(',')) {
    let step = 1, range = part;
    const sm = part.match(/^(.+)\/(\d+)$/);
    if (sm) { range = sm[1]; step = +sm[2]; if (step < 1) throw new Error('bad step'); }
    let lo, hi;
    if (range === '*') { lo = min; hi = max; }
    else if (range.includes('-')) {
      const [a, b] = range.split('-');
      lo = norm(a); hi = norm(b);
    } else { lo = hi = norm(range); }
    if (sm) hi = max; // */n and a-b/n: apply step across full range per Vixie (approx)
    if (lo < min || hi > max || lo > hi) throw new Error('out of range: ' + field);
    for (let i = lo; i <= hi; i += step) out.add(i);
  }
  return out;
  function norm(t) {
    const tl = String(t).toLowerCase();
    if (names) { const i = names.indexOf(tl); if (i >= 0) return i + (names === MONTHS ? 1 : 0); }
    const n = parseInt(t, 10);
    if (isNaN(n)) throw new Error('bad token: ' + t);
    return n;
  }
}

function parseCron(expr) {
  const f = expr.trim().split(/\s+/);
  if (f.length !== 5) throw new Error('need 5 fields: m h dom mon dow');
  const minute = parseField(f[0], 0, 59);
  const hour = parseField(f[1], 0, 23);
  const dom = parseField(f[2], 1, 31);
  const month = parseField(f[3], 1, 12, MONTHS);
  let dow = parseField(f[4], 0, 6, DOWS);
  // map 7 -> 0 (Sunday)
  if (dow.delete(7)) dow.add(0);
  const domRestricted = f[2] !== '*';
  const dowRestricted = f[4] !== '*';
  return { minute, hour, dom, month, dow, domRestricted, dowRestricted, fields: f };
}

function nextRuns(parsed, from, count) {
  const runs = [];
  let d = new Date(from.getTime());
  d.setUTCSeconds(0, 0);
  d.setUTCMinutes(d.getUTCMinutes() + 1); // start strictly after
  while (runs.length < count && d.getTime() - from.getTime() < 366 * 864e5) {
    if (!parsed.month.has(d.getUTCMonth() + 1)) { d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)); continue; }
    const domOk = parsed.dom.has(d.getUTCDate());
    const dowOk = parsed.dow.has(d.getUTCDay());
    let dayOk;
    if (parsed.domRestricted && parsed.dowRestricted) dayOk = domOk || dowOk; // Vixie: OR when both restricted
    else dayOk = domOk && dowOk;
    if (!dayOk) { d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1)); continue; }
    if (!parsed.hour.has(d.getUTCHours())) { d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours() + 1)); continue; }
    if (!parsed.minute.has(d.getUTCMinutes())) { d.setUTCMinutes(d.getUTCMinutes() + 1); continue; }
    runs.push(d.toISOString());
    d = new Date(d.getTime() + 60000);
  }
  return runs;
}

function routeCron(u, res, json) {
  const p = u.searchParams;
  const expr = p.get('expr');
  if (!expr) return json(res, 200, { usage: '?expr=*/5 * * * *&count=3 (next runs) — fields: min hour dom mon dow; supports */n, ranges, lists, names' });
  let parsed;
  try { parsed = parseCron(expr); } catch (e) { return json(res, 400, { error: e.message }); }
  const count = Math.min(parseInt(p.get('count') || '3', 10) || 3, 20);
  const from = p.get('from') ? new Date(p.get('from')) : new Date();
  if (isNaN(from)) return json(res, 400, { error: 'invalid from date' });
  const runs = nextRuns(parsed, from, count);
  return json(res, 200, {
    expression: expr,
    description: `at minute ${[...parsed.minute].sort((a,b)=>a-b).join(',')} past hour ${[...parsed.hour].sort((a,b)=>a-b).join(',')}`,
    next_runs: runs,
    next_run: runs[0] || null,
  });
}
module.exports = { routeCron, parseCron, nextRuns };
