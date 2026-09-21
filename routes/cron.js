// Cron expression parser/validator: 5-field standard cron, next-run calculation, human-readable description
function parseField(expr, min, max, names) {
  const result = new Set();
  for (const part of expr.split(',')) {
    let step = 1;
    const [base, stepStr] = part.split('/');
    if (stepStr !== undefined) {
      step = +stepStr;
      if (!Number.isInteger(step) || step < 1) throw new Error(`invalid step in '${part}'`);
    }
    let start, end;
    if (base === '*') { start = min; end = max; }
    else if (base.includes('-')) {
      const [a, b] = base.split('-').map(v => names ? (names[v.toUpperCase()] ?? +v) : +v);
      if (!Number.isInteger(a) || !Number.isInteger(b) || a > b) throw new Error(`invalid range '${base}'`);
      start = a; end = b;
    } else {
      const v = names ? (names[base.toUpperCase()] ?? +base) : +base;
      if (!Number.isInteger(v)) throw new Error(`invalid value '${base}'`);
      start = v; end = stepStr !== undefined ? max : v;
    }
    for (let i = start; i <= end; i += step) {
      if (i < min || i > max) throw new Error(`value ${i} out of range ${min}-${max}`);
      result.add(i);
    }
  }
  return [...result].sort((a, b) => a - b);
}
function nextRun(sec, min, hour, dom, mon, dow) {
  const d = new Date(); d.setSeconds(0, 0);
  const S = new Set(sec), Mi = new Set(min), H = new Set(hour), DoM = new Set(dom), Mo = new Set(mon), DoW = new Set(dow);
  for (let i = 0; i < 366 * 24 * 60; i++) {
    if (Mo.has(d.getMonth() + 1) && DoM.has(d.getDate()) && DoW.has(d.getDay()) && H.has(d.getHours()) && Mi.has(d.getMinutes())) return d.toISOString();
    d.setMinutes(d.getMinutes() + 1);
  }
  return null;
}
const MONTHS = { JAN:1,FEB:2,MAR:3,APR:4,MAY:5,JUN:6,JUL:7,AUG:8,SEP:9,OCT:10,NOV:11,DEC:12 };
const DAYS = { SUN:0,MON:1,TUE:2,WED:3,THU:4,FRI:5,SAT:6 };
function describe(f) {
  const [m, h, dom, mon, dow] = f;
  if (m === '0' && h.includes('-')) return `every day between ${h.split('-')[0]}:00 and ${h.split('-')[1]}:00`;
  if (m === '*' && h === '*') return 'every minute';
  if (h === '*') return `hourly at minute ${m}`;
  if (dom === '*' && dow === '*') return `daily at ${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
  if (dom === '*' && mon === '*' && dow !== '*') return `weekly (${dow}) at ${h}:${m}`;
  return `at ${h}:${m} on ${dom} (month ${mon}, weekday ${dow})`;
}
function routeCron(u, res, json) {
  const q = Object.fromEntries(new URL(u, 'http://x').searchParams);
  const expr = q.expr || q.cron || q.e || '';
  if (!expr) return json(res, 400, { error: 'provide ?expr=<5-field cron expression>' });
  const fields = expr.trim().split(/\s+/);
  if (fields.length !== 5) return json(res, 400, { error: 'expected exactly 5 fields (minute hour dom month dow)', got: fields.length });
  try {
    const minute = parseField(fields[0], 0, 59);
    const hour = parseField(fields[1], 0, 23);
    const dom = parseField(fields[2], 1, 31);
    const month = parseField(fields[3], 1, 12, MONTHS);
    const dow = parseField(fields[4], 0, 7, DAYS);
    if (dow.includes(7) && !dow.includes(0)) { dow.push(0); dow.sort(); } // 7 == Sunday
    return json(res, 200, {
      expression: expr.trim(), valid: true,
      fields: { minute, hour, dayOfMonth: dom, month, dayOfWeek: dow },
      description: describe(fields),
      nextRun: nextRun(minute, hour, dom, month, dow),
    });
  } catch (e) {
    return json(res, 400, { expression: expr.trim(), valid: false, error: e.message });
  }
}
module.exports = { routeCron };
