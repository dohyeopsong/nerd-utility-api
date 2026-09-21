// Cron expression explainer: 5-field cron -> human-readable description + next runs
const DOW = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MON = ['January','February','March','April','May','June','July','August','September','October','November','December'];
function describeField(field, min, max, unitPlural, names) {
  if (field === '*') return `every ${unitPlural}`;
  const steps = field.split('/');
  if (steps.length === 2) {
    return `every ${steps[1]} ${unitPlural}${names ? '' : ''}${steps[0] !== '*' ? ` from ${steps[0]}` : ''}`;
  }
  if (field.includes('-')) { const [a,b] = field.split('-'); return `${unitPlural} ${a} through ${b}`; }
  if (field.includes(',')) return `${unitPlural} ${field.split(',').join(', ')}`;
  if (names && names[field]) return names[field];
  return `at ${unitPlural} ${field}`;
}
function explainCron(expr) {
  const parts = String(expr).trim().split(/\s+/);
  if (parts.length !== 5) throw new Error('expected 5 fields (min hour dom month dow), got ' + parts.length);
  const [mi, h, dom, mon, dow] = parts;
  if (mi === '*' && h === '*' && dom === '*' && mon === '*' && dow === '*') return 'every minute';
  let desc = [];
  desc.push(describeField(mi, 0, 59, 'minute'));
  desc.push(describeField(h, 0, 23, 'hour'));
  if (dom !== '*') desc.push(describeField(dom, 1, 31, 'day-of-month'));
  if (mon !== '*') desc.push(describeField(mon, 1, 12, 'month'));
  if (dow !== '*') desc.push(describeField(dow, 0, 6, 'day-of-week', Object.fromEntries(DOW.map((d,i)=>[String(i),d]))));
  return desc.join(', ');
}
function nextRuns(expr, count = 3) {
  // Brute-force scan next matches within 1 year (minute resolution)
  const parts = String(expr).trim().split(/\s+/);
  const [mi, h, dom, mon, dow] = parts.map(p => {
    if (p === '*') return null;
    if (p.includes('/')) { const [a, s] = p.split('/'); const start = a === '*' ? 0 : +a; return v => (v - start) % +s === 0 && v >= start; }
    if (p.includes('-')) { const [a,b] = p.split('-').map(Number); return v => v >= a && v <= b; }
    if (p.includes(',')) { const set = new Set(p.split(',').map(Number)); return v => set.has(v); }
    return v => v === +p;
  });
  const miF = mi || (() => true), hF = h || (() => true), domF = dom || (() => true), monF = mon || (() => true), dowF = dow || (() => true);
  const out = [];
  const d = new Date(); d.setSeconds(0, 0); d.setMinutes(d.getMinutes() + 1);
  const end = new Date(d.getTime() + 366*24*3600*1000);
  while (out.length < count && d < end) {
    if (miF(d.getMinutes()) && hF(d.getHours()) && domF(d.getDate()) && monF(d.getMonth()+1) && dowF(d.getDay())) {
      out.push(new Date(d).toISOString()); d.setMinutes(d.getMinutes() + 1);
      continue;
    }
    d.setMinutes(d.getMinutes() + 1);
  }
  return out;
}
function routeCron(u, res, json) {
  const q = Object.fromEntries(new URL(u, 'http://x').searchParams);
  const expr = q.expr || q.cron || q.number;
  if (!expr) return json(res, 400, { error: 'provide ?expr=<cron expression>' });
  try {
    const description = explainCron(expr);
    const next = nextRuns(expr, 3);
    return json(res, 200, { input: expr, description, nextRuns: next });
  } catch (e) { return json(res, 400, { error: e.message }); }
}
module.exports = { routeCron, explainCron, nextRuns };
