// /cron — parse cron expressions: human description + next N run times
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
function parseField(field, min, max, names) {
  if (field === '*') return { all: true, values: null };
  const vals = new Set();
  for (const part of field.split(',')) {
    const m = part.match(/^(\*|[A-Za-z]+|\d+)(?:-([A-Za-z]+|\d+))?(?:\/(\d+))?$/);
    if (!m) throw new Error('bad cron field part: ' + part);
    const [, base, end, stepStr] = m;
    const step = stepStr ? +stepStr : 1;
    if (step < 1) throw new Error('bad step: ' + part);
    const lo = base === '*' ? min : resolve(base, names, min, max);
    const hi = end !== undefined ? resolve(end, names, min, max) : (base === '*' ? max : lo);
    if (isNaN(lo) || isNaN(hi)) throw new Error('bad values in: ' + part);
    if (lo < min || hi > max || lo > hi) throw new Error('out of range: ' + part);
    for (let v = lo; v <= hi; v += step) vals.add(v);
  }
  return { all: false, values: [...vals].sort((a, b) => a - b) };
}
function resolve(tok, names, min, max) {
  if (/^\d+$/.test(tok)) return +tok;
  if (names) {
    const t = tok.toLowerCase();
    const i = names.findIndex(n => n.toLowerCase() === t || n.toLowerCase().slice(0, 3) === t);
    if (i >= 0) return i + (names === MONTHS ? 1 : 0);
  }
  return NaN;
}
function fmtNums(vals) { return vals.join(', '); }
function routeCron(u, res, json) {
  const q = u.searchParams;
  const expr = q.get('expr') || q.get('cron') || '';
  if (!expr) return json(res, 400, { error: 'expr required, e.g. expr=30 2 * * 1-5' });
  const raw = expr.trim().split(/\s+/);
  if (raw.length !== 5) return json(res, 400, { error: 'expected 5 fields (min hour dom mon dow), got ' + raw.length });
  let fields;
  try {
    fields = [
      { raw: raw[0], ...parseField(raw[0], 0, 59) },
      { raw: raw[1], ...parseField(raw[1], 0, 23) },
      { raw: raw[2], ...parseField(raw[2], 1, 31) },
      { raw: raw[3], ...parseField(raw[3], 1, 12, MONTHS) },
      { raw: raw[4], ...parseField(raw[4], 0, 6, DAYS) }
    ];
  } catch (e) { return json(res, 400, { error: e.message }); }
  const [mi, hr, dom, mon, dow] = fields;
  // --- time description ---
  let timePart;
  if (mi.all && hr.all) timePart = 'every minute';
  else if (hr.all) timePart = `at minutes ${fmtNums(mi.values)} of every hour`;
  else if (mi.all) timePart = `every minute of hour${hr.values.length > 1 ? 's' : ''} ${fmtNums(hr.values)}`;
  else if (mi.values.length === 1 && hr.values.length === 1)
    timePart = `at ${String(hr.values[0]).padStart(2, '0')}:${String(mi.values[0]).padStart(2, '0')}`;
  else timePart = `at hour${hr.values.length > 1 ? 's' : ''} ${fmtNums(hr.values)} minute${mi.values.length > 1 ? 's' : ''} ${fmtNums(mi.values)}`;
  // --- day/month description ---
  let dayPart;
  if (dow.all && dom.all) dayPart = 'every day';
  else if (dow.all) dayPart = `on day${dom.values.length > 1 ? 's' : ''} ${fmtNums(dom.values)} of the month`;
  else if (dom.all) dayPart = `on ${dow.values.map(d => DAYS[d]).join(', ')}`;
  else dayPart = `on day${dom.values.length > 1 ? 's' : ''} ${fmtNums(dom.values)} or ${dow.values.map(d => DAYS[d]).join(', ')}`;
  const monPart = mon.all ? '' : ` in ${mon.values.map(m => MONTHS[m - 1]).join(', ')}`;
  const desc = `${timePart}, ${dayPart}${monPart}`;
  // --- next runs: brute force minute scan from now (UTC) ---
  const count = Math.min(+(q.get('count') || 3), 10);
  const next = [];
  const d = new Date();
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() + 1);
  const ok = (get, f) => f.all || f.values.includes(get);
  for (let i = 0; i < 527040 && next.length < count; i++) { // up to 1 year of minutes
    if (ok(d.getMinutes(), mi) && ok(d.getHours(), hr) && ok(d.getDate(), dom) && ok(d.getMonth() + 1, mon) && ok(d.getDay(), dow)) {
      next.push(d.toISOString());
    }
    d.setMinutes(d.getMinutes() + 1);
  }
  return json(res, 200, {
    expr, fields: raw,
    description: desc,
    next_runs: next,
    timezone: 'UTC'
  });
}
module.exports = { routeCron };
