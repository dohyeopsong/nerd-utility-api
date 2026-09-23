// /cron — parse & explain cron expressions, compute next run times
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function parseField(field, min, max, names) {
  const result = new Set();
  for (const part of field.split(',')) {
    let step = 1;
    let range = part;
    if (part.includes('/')) {
      const [r, s] = part.split('/');
      range = r; step = parseInt(s, 10);
      if (!step || step < 1) throw new Error('invalid step in "' + part + '"');
    }
    let lo, hi;
    if (range === '*') { lo = min; hi = max; }
    else if (range.includes('-')) {
      const [a, b] = range.split('-');
      lo = nameToNum(a, names, min); hi = nameToNum(b, names, min);
    } else {
      lo = hi = nameToNum(range, names, min);
      if (!part.includes('/')) { result.add(lo); continue; }
    }
    if (lo < min || hi > max || lo > hi) throw new Error('value out of range (' + min + '-' + max + ') in "' + part + '"');
    for (let v = lo; v <= hi; v += step) result.add(v);
  }
  return result;
}

function nameToNum(s, names, min) {
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  if (names) {
    const i = names.findIndex(n => n.toLowerCase() === s.toLowerCase());
    if (i >= 0) return i + min;
  }
  throw new Error('invalid value "' + s + '"');
}

function explainCron(expr) {
  const fields = expr.trim().split(/\s+/);
  if (fields.length !== 5) return { error: 'standard cron has 5 fields: minute hour day-of-month month day-of-week' };
  const [m, h, dom, mon, dow] = fields;
  const mins = [...parseField(m, 0, 59)];
  const hours = [...parseField(h, 0, 23)];
  const doms = [...parseField(dom, 1, 31)];
  const mons = [...parseField(mon, 1, 12, MONTHS)];
  const dows = [...parseField(dow, 0, 6, DAYS)];

  const desc = [];
  desc.push('Minute: ' + (mins.length === 60 ? 'every minute' : mins.join(', ')));
  desc.push('Hour: ' + (hours.length === 24 ? 'every hour' : hours.join(', ')));
  desc.push('Day of month: ' + (doms.length === 31 ? 'every day' : doms.join(', ')));
  desc.push('Month: ' + (mons.length === 12 ? 'every month' : mons.map(n => MONTHS[n-1]).join(', ')));
  desc.push('Day of week: ' + (dows.length === 7 ? 'every weekday' : dows.map(n => DAYS[n]).join(', ')));

  return { expr, fields: { minute: mins, hour: hours, dayOfMonth: doms, month: mons, dayOfWeek: dows }, explanation: desc.join('; ') };
}

function nextRuns(expr, count) {
  const e = explainCron(expr);
  if (e.error) return e;
  const f = e.fields;
  const domSet = new Set(f.dayOfMonth), monSet = new Set(f.month);
  const dowSet = new Set(f.dayOfWeek);
  const anyDom = f.dayOfMonth.length === 31, anyDow = f.dayOfWeek.length === 7;
  const mins = new Set(f.minute), hours = new Set(f.hour);

  const runs = [];
  let t = Date.now() + 60000;
  t = Math.ceil(t / 60000) * 60000;
  while (runs.length < count) {
    const d = new Date(t);
    if (!monSet.has(d.getUTCMonth() + 1)) { t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1); continue; }
    const domOk = domSet.has(d.getUTCDate());
    const dowOk = dowSet.get ? dowOk : dowSet.has(d.getUTCDay());
    const dayOk = (anyDom && anyDow) || (anyDom ? dowOk : (anyDow ? domOk : domOk && dowOk));
    if (!dayOk) { t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1); continue; }
    if (!hours.has(d.getUTCHours())) { t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours() + 1); continue; }
    if (!mins.has(d.getUTCMinutes())) { t += 60000; continue; }
    runs.push(new Date(t).toISOString());
    t += 60000;
  }
  return runs;
}

function routeCron(u, res, json) {
  const p = u.searchParams;
  const expr = p.get('expr') || p.get('cron');
  if (!expr) return json(res, 400, { error: 'provide ?expr="*/5 8-17 * * 1-5"' });
  const e = explainCron(expr);
  if (e.error) return json(res, 400, e);
  const count = Math.min(parseInt(p.get('count') || '3', 10) || 3, 10);
  const runs = nextRuns(expr, count);
  return json(res, 200, { ...e, nextRuns: Array.isArray(runs) ? runs : [] });
}

module.exports = { routeCron, explainCron, nextRuns };
