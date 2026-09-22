// /cron — cron expression parser and next-run calculator
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
function parseField(field, min, max, names) {
  if (field === '*') return { type: 'all' };
  const list = [];
  for (const part of field.split(',')) {
    let step = 1;
    let base = part;
    const sm = part.match(/^(.+)\/(\d+)$/);
    if (sm) { base = sm[1]; step = +sm[2]; if (step < 1) throw new Error('step must be >= 1'); }
    if (base === '*') {
      list.push({ type: 'range', from: min, to: max, step });
      continue;
    }
    let rm = base.match(/^(\w+)-(\w+)$/);
    if (rm) {
      let from = rm[1], to = rm[2];
      if (names) { from = names.indexOf(from) >= 0 ? names.indexOf(from) : from; to = names.indexOf(to) >= 0 ? names.indexOf(to) : to; }
      from = +from; to = +to;
      if (isNaN(from) || isNaN(to) || from < min || to > max || from > to) throw new Error(`invalid range: ${part}`);
      list.push({ type: 'range', from, to, step });
      continue;
    }
    let v = names && names.indexOf(base) >= 0 ? names.indexOf(base) : +base;
    if (isNaN(v) || v < min || v > max) throw new Error(`invalid value: ${part}`);
    if (step !== 1) list.push({ type: 'range', from: v, to: max, step });
    else list.push({ type: 'value', value: v });
  }
  return { type: 'list', items: list };
}
function fieldMatches(f, v) {
  if (f.type === 'all') return true;
  for (const item of f.items) {
    if (item.type === 'value') { if (v === item.value) return true; }
    else if (v >= item.from && v <= item.to && (v - item.from) % item.step === 0) return true;
  }
  return false;
}
function describeField(f, unit) {
  if (f.type === 'all') return `every ${unit}`;
  const parts = [];
  for (const item of f.items) {
    if (item.type === 'value') parts.push(item.value);
    else if (item.step === 1) parts.push(item.from === item.to ? `${item.from}` : `${item.from}-${item.to}`);
    else parts.push(item.from === 0 && item.to >= 59 ? `every ${item.step} ${unit}s` : `${item.from}-${item.to}/${item.step}`);
  }
  return parts.join(', ');
}
function nextRuns(fields, from, count) {
  const out = [];
  let d = new Date(from.getTime());
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() + 1);
  for (const run of out) {}
  const limit = Date.now() + 366 * 86400 * 1000; // 1 year cap
  while (out.length < count && d.getTime() < limit) {
    if (!fieldMatches(fields.dom, d.getDate())) { d.setDate(d.getDate() + 1); d.setHours(0, 0, 0, 0); continue; }
    if (!fieldMatches(fields.mon, d.getMonth())) { d.setMonth(d.getMonth() + 1, 1); d.setHours(0, 0, 0, 0); continue; }
    // DOW restricted? (dom '*' + dow restricted => dow only)
    const domAll = fields.dom.type === 'all';
    const dowAll = fields.dow.type === 'all';
    if (!domAll && !dowAll) {
      // standard cron: OR semantics when both restricted
      if (!fieldMatches(fields.dow, d.getDay()) && !fieldMatches(fields.dom, d.getDate())) { d.setDate(d.getDate() + 1); d.setHours(0, 0, 0, 0); continue; }
    } else if (!dowAll) {
      if (!fieldMatches(fields.dow, d.getDay())) { d.setDate(d.getDate() + 1); d.setHours(0, 0, 0, 0); continue; }
    }
    if (!fieldMatches(fields.hour, d.getHours())) { d.setHours(d.getHours() + 1, 0, 0, 0); continue; }
    if (!fieldMatches(fields.min, d.getMinutes())) { d.setMinutes(d.getMinutes() + 1); continue; }
    out.push(new Date(d));
    d.setMinutes(d.getMinutes() + 1);
  }
  return out;
}
function routeCron(u, res, json) {
  const q = u.searchParams;
  const mode = (q.get('mode') || 'describe').toLowerCase();
  const expr = q.get('expr') || q.get('c');
  if (!expr) return json(res, 400, { error: 'expr required, e.g. expr=*/5 * * * *' });
  const f = expr.trim().split(/\s+/);
  if (f.length !== 5) return json(res, 400, { error: 'cron expression must have 5 fields (min hour dom mon dow)' });
  let fields;
  try {
    fields = {
      min: parseField(f[0], 0, 59),
      hour: parseField(f[1], 0, 23),
      dom: parseField(f[2], 1, 31),
      mon: parseField(f[3], 1, 12, MONTHS),
      dow: parseField(f[4], 0, 6, DAYS)
    };
  } catch (e) { return json(res, 400, { error: e.message }); }
  const description = `At ${describeField(fields.min, 'minute')}, ${describeField(fields.hour, 'hour')}, ${describeField(fields.dom, 'day-of-month')}, ${describeField(fields.mon, 'month')}, ${describeField(fields.dow, 'day-of-week')}`;
  if (mode === 'describe') {
    return json(res, 200, { expr, valid: true, description });
  }
  if (mode === 'next' || mode === 'nextruns') {
    const n = Math.min(+(q.get('n') || 5), 50);
    const from = q.get('from') ? new Date(q.get('from')) : new Date();
    if (isNaN(from)) return json(res, 400, { error: 'invalid from date' });
    const runs = nextRuns(fields, from, n);
    return json(res, 200, {
      expr, description,
      from: from.toISOString(),
      next_runs: runs.map(r => r.toISOString())
    });
  }
  return json(res, 400, { error: 'mode must be describe|next' });
}
module.exports = { routeCron };
