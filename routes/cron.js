// /cron — parse a 5-field cron expression, explain it, and compute next runs
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DOWS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
function parseField(field, min, max, names) {
  const values = new Set();
  for (const part of field.split(',')) {
    const [range, stepRaw] = part.split('/');
    const step = stepRaw ? parseInt(stepRaw, 10) : 1;
    let start, end;
    if (range === '*') { start = min; end = max; }
    else if (range.includes('-')) {
      const [a, b] = range.split('-');
      start = names && names[a] !== undefined ? DOWS.indexOf(a) >= 0 ? DOWS.indexOf(a) : MONTHS.indexOf(a) + 1 : parseInt(a, 10);
      end = names && names[b] !== undefined ? DOWS.indexOf(b) >= 0 ? DOWS.indexOf(b) : MONTHS.indexOf(b) + 1 : parseInt(b, 10);
    } else {
      start = end = parseInt(range, 10);
      if (names && isNaN(start)) {
        const di = DOWS.indexOf(range); const mi = MONTHS.indexOf(range);
        if (di >= 0) start = end = di;
        else if (mi >= 0) start = end = mi + 1;
      }
    }
    if (isNaN(start) || isNaN(end) || start < min || end > max || start > end) throw new Error(`invalid field "${field}"`);
    for (let v = start; v <= end; v += step) values.add(v % (max + 1) || v === 0 && min === 0 ? v : v);
  }
  return values;
}
function routeCron(u, res, json) {
  const q = Object.fromEntries(u.searchParams.entries());
  const expr = (q.expr || q.e || '').trim();
  if (!expr) throw new Error('missing ?expr=*/5 * * * *');
  const fields = expr.split(/\s+/);
  if (fields.length !== 5) throw new Error(`expected 5 fields (min hour dom month dow), got ${fields.length}`);
  const [mins, hours, doms, months, dows] = [
    parseField(fields[0], 0, 59), parseField(fields[1], 0, 23),
    parseField(fields[2], 1, 31), parseField(fields[3], 1, 12), parseField(fields[4], 0, 6),
  ];
  // describe
  const desc = [];
  desc.push(fields[0] === '*' ? 'every minute' : mins.size === 1 ? `at minute ${[...mins][0]}` : `minutes ${[...mins].join(',')}`);
  desc.push(fields[1] === '*' ? 'every hour' : hours.size === 1 ? `at hour ${[...hours][0]}` : `hours ${[...hours].join(',')}`);
  if (fields[3] !== '*') desc.push(`in ${[...months].map(m => MONTHS[m-1]).join(',')}`);
  if (fields[4] !== '*') desc.push(`on ${[...dows].map(d => DOWS[d]).join(',')}`);
  if (fields[2] !== '*') desc.push(`day-of-month ${[...doms].join(',')}`);
  // next runs: brute force forward 366 days, 15-min granularity (plus exact minute matching)
  const next = [];
  const start = new Date();
  start.setUTCSeconds(0, 0); start.setUTCMinutes(start.getUTCMinutes() + 1);
  const cur = new Date(start);
  outer: for (let days = 0; days < 366 && next.length < 5; days++) {
    cur.setUTCDate(cur.getUTCDate() + (days ? 1 : 0));
    if (days === 0) cur.setUTCHours(0, 0, 0, 0);
    if (!months.has(cur.getUTCMonth() + 1) || !dows.has(cur.getUTCDay()) || !doms.has(cur.getUTCDate())) continue;
    for (const h of [...hours].sort((a, b) => a - b)) {
      for (const m of [...mins].sort((a, b) => a - b)) {
        const t = new Date(cur); t.setUTCHours(h, m, 0, 0);
        if (t >= start && next.findIndex(x => x.getTime() === t.getTime()) === -1) {
          next.push(t);
          if (next.length === 5) break outer;
        }
      }
    }
  }
  return json(res, 200, {
    expression: expr,
    description: desc.join(', '),
    fields: { minutes: [...mins], hours: [...hours], daysOfMonth: [...doms], months: [...months], daysOfWeek: [...dows] },
    nextRuns: next.map(d => d.toISOString()),
    timezone: 'UTC',
  });
}
module.exports = { routeCron };
