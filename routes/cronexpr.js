// /cronexpr — parse cron expression, describe it, compute next runs
function parseCronField(expr, min, max, aliases) {
  if (expr === '*') return { every: 1 };
  // */n
  let m = expr.match(/^\*\/(\d+)$/);
  if (m) return { every: parseInt(m[1], 10) };
  // a-b/n
  m = expr.match(/^(\d+)-(\d+)\/(\d+)$/);
  if (m) return { range: [parseInt(m[1], 10), parseInt(m[2], 10)], every: parseInt(m[3], 10) };
  // a-b
  m = expr.match(/^(\d+)-(\d+)$/);
  if (m) return { range: [parseInt(m[1], 10), parseInt(m[2], 10)] };
  // alias
  if (aliases && aliases[expr.toLowerCase()] !== undefined) return { value: aliases[expr.toLowerCase()] };
  // plain number
  m = expr.match(/^(\d+)$/);
  if (m) return { value: parseInt(m[1], 10) };
  // list a,b,c
  if (expr.includes(',')) {
    const list = expr.split(',').map(x => parseCronField(x.trim(), min, max, aliases));
    return { list };
  }
  throw new Error(`invalid cron field: ${expr}`);
}

function fieldMatches(f, v) {
  if (f.every && !f.range) return v % f.every === 0;
  if (f.range) {
    const [a, b] = f.range;
    if (v < a || v > b) return false;
    if (f.every) return (v - a) % f.every === 0;
    return true;
  }
  if (f.value !== undefined) return v === f.value;
  if (f.list) return f.list.some(x => fieldMatches(x, v));
  return false;
}

function describeCron(fields) {
  const [min, hour, dom, mon, dow] = fields;
  const parts = [];
  // time description
  if (min.every && hour.every) parts.push(`every ${hour.every === 1 ? '' : hour.every + ' hour(s) '}on the ${min.every === 1 ? 'minute' : 'every ' + min.every + ' minutes'}`);
  else if (min.every && !hour.every) {
    if (hour.value !== undefined) parts.push(`at minute ${min.every} past hour ${hour.value}`);
    else parts.push(`every ${min.every} minutes`);
  } else if (min.value !== undefined && hour.value !== undefined) parts.push(`at ${String(hour.value).padStart(2, '0')}:${String(min.value).padStart(2, '0')}`);
  else if (hour.value !== undefined) parts.push(`at hour ${hour.value}, minute ${min.value !== undefined ? min.value : '0'}`);
  if (mon.every && mon.every === 1 && dom.every && dom.every === 1 && dow.every && dow.every === 1) parts.push('every day');
  else {
    if (mon.value !== undefined) parts.push(`in month ${mon.value}`);
    if (dom.value !== undefined) parts.push(`on day ${dom.value} of month`);
    if (dow.value !== undefined) parts.push(`on day-of-week ${dow.value}`);
  }
  return parts.join(' ');
}

function nextRuns(fields, count, from) {
  const [min, hour, dom, mon, dow] = fields;
  const runs = [];
  let d = new Date(from);
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() + 1); // start from next minute
  while (runs.length < count) {
    if (d.getFullYear() > from.getFullYear() + 5) break; // 5-year safety cap
    const minute = d.getMinutes(), hr = d.getHours(), day = d.getDate(), month = d.getMonth() + 1, wd = d.getDay();
    if (fieldMatches(mon, month) && fieldMatches(dom, day) && fieldMatches(dow, wd) && fieldMatches(hour, hr) && fieldMatches(min, minute)) {
      runs.push(d.toISOString());
      d = new Date(d.getTime() + 60000);
    } else {
      d = new Date(d.getTime() + 60000);
    }
  }
  return runs;
}

function routeCron(u, res, json) {
  const q = u.searchParams;
  const expr = q.get('expr') || q.get('e');
  const mode = q.get('mode') || 'next'; // next|describe
  const count = Math.min(parseInt(q.get('count') || '3', 10) || 3, 10);
  const fromStr = q.get('from');

  if (!expr) return json(res, 400, { error: 'missing expr parameter', example: '/cronexpr?expr=0%209%20*%20*%20*' });

  try {
    const parts = expr.trim().split(/\s+/);
    if (parts.length !== 5) throw new Error(`expected 5 fields (min hour dom month dow), got ${parts.length}`);

    const monthAliases = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
    const dowAliases = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
    const fields = [
      parseCronField(parts[0], 0, 59, null),
      parseCronField(parts[1], 0, 23, null),
      parseCronField(parts[2], 1, 31, null),
      parseCronField(parts[3], 1, 12, monthAliases),
      parseCronField(parts[4], 0, 7, dowAliases),
    ];

    const out = { expression: expr, fields: parts, description: describeCron(fields) };
    if (mode === 'describe') return json(res, 200, out);
    out.next_runs = nextRuns(fields, count, fromStr ? new Date(fromStr) : new Date());
    return json(res, 200, out);
  } catch (e) {
    return json(res, 400, { error: e.message });
  }
}
module.exports = { routeCron };
