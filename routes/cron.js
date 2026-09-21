// Cron expression parser, explainer, and next-run calculator (5-field standard cron)
const FIELD_NAMES = ['minute','hour','day of month','month','day of week'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
function parseField(field, min, max, names) {
  if (field === '*') return { values: null, desc: 'every ' + (names ? names.toLowerCase() : 'value') };
  const out = new Set();
  const descs = [];
  for (const part of field.split(',')) {
    const stepM = part.match(/^(\*|\d+-\d+|\d+)\/(\d+)$/);
    if (stepM) {
      const base = stepM[1];
      let start, end = max;
      if (base === '*') start = min;
      else if (base.includes('-')) { const [a,b] = base.split('-'); start = +a; end = +b; }
      else start = +base;
      const step = +stepM[2];
      for (let v = start; v <= end; v += step) out.add(v);
      descs.push(base === '*' ? `every ${step}` : `from ${start} to ${end} every ${step}`);
      continue;
    }
    const rangeM = part.match(/^(\d+)-(\d+)$/);
    if (rangeM) { const a = +rangeM[1], b = +rangeM[2]; for (let v = a; v <= b; v++) out.add(v); descs.push(`${a} through ${b}`); continue; }
    if (/^\d+$/.test(part)) { const v = +part; out.add(v); descs.push(String(v)); continue; }
    throw new Error('invalid cron field: ' + field);
  }
  return { values: [...out].sort((a,b)=>a-b), desc: descs.join(', ') };
}
function explain(expr) {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) throw new Error('expected 5 fields: minute hour dom month dow');
  const ranges = [[0,59],[0,23],[1,31],[1,12],[0,7]];
  const fields = parts.map((p, i) => parseField(p, ranges[i][0], ranges[i][1]));
  const human = [];
  if (fields[0].values) human.push(`at minute ${fields[0].desc}`); else human.push('every minute');
  if (fields[1].values) human.push(`past hour ${fields[1].desc}`); else if (!fields[0].values === false) {}
  if (fields[2].values) human.push(`on day-of-month ${fields[2].desc}`);
  if (fields[3].values) human.push(`in month ${fields[3].desc}`);
  if (fields[4].values) human.push(`on ${[...new Set(fields[4].values.map(v => DAYS[v % 7]))].join('/')}`);
  return { fields: parts.map((p,i) => ({ field: FIELD_NAMES[i], expr: p, description: fields[i].desc })), human: human.join(', ') };
}
function matches(d, fields) {
  const mi = d.getUTCMinutes(), h = d.getUTCHours(), dom = d.getUTCDate(), mo = d.getUTCMonth()+1, dow = d.getUTCDay();
  const chk = (f, v, alt) => f.values === null ? true : (f.values.includes(v) || (alt !== undefined && f.values.includes(alt)));
  return chk(fields[0], mi) && chk(fields[1], h) && chk(fields[2], dom) && chk(fields[3], mo) && chk(fields[4], dow, 7);
}
function nextRuns(expr, count = 3, from = new Date()) {
  const fields = explain(expr); // validates
  const parsed = expr.trim().split(/\s+/).map((p,i) => parseField(p, [[0,59],[0,23],[1,31],[1,12],[0,7]][i][0], [[0,59],[0,23],[1,31],[1,12],[0,7]][i][1]));
  const runs = [];
  let d = new Date(from); d.setUTCSeconds(0, 0); d.setUTCMinutes(d.getUTCMinutes() + 1);
  while (runs.length < count && d < new Date(from.getTime() + 365*24*3600*1000)) {
    if (matches(d, parsed)) { runs.push(d.toISOString()); d.setUTCMinutes(d.getUTCMinutes() + 1); continue; }
    d.setUTCMinutes(d.getUTCMinutes() + 1);
  }
  return runs;
}
function routeCron(u, res, json) {
  const q = Object.fromEntries(new URL(u, 'http://x').searchParams);
  if (!q.expr) return json(res, 400, { error: 'provide ?expr=<cron expression>' });
  try {
    const info = explain(q.expr);
    const next = nextRuns(q.expr, 3);
    return json(res, 200, { expression: q.expr, ...info, nextRuns: next });
  } catch (e) { return json(res, 400, { error: e.message }); }
}
module.exports = { routeCron, explain, nextRuns };
