// /cron — cron expression explainer + next runs (5-field, no external deps)
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DOWS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
function parseField(s, min, max, names) {
  const out = new Set();
  for (const part of s.split(',')) {
    let step = 1, range = part;
    const si = part.indexOf('/');
    if (si >= 0) { step = parseInt(part.slice(si+1),10); range = part.slice(0,si); }
    let a, b;
    if (range === '*') { a = min; b = max; }
    else {
      const d = range.indexOf('-');
      if (d >= 0) { a = range.slice(0,d); b = range.slice(d+1); }
      else { a = range; b = range; }
    }
    a = names ? (names[a] !== undefined ? names[a] : parseInt(a,10)) : parseInt(a,10);
    b = names ? (names[b] !== undefined ? names[b] : parseInt(b,10)) : parseInt(b,10);
    if (!range.includes('-') && si >= 0 && range !== '*') b = max; // "N/step" means N-max/step
    if (isNaN(a) || isNaN(b) || isNaN(step) || a < min || b > max || a > b || step < 1) return null;
    for (let i = a; i <= b; i += step) out.add(i % (max + 1));
  }
  return out;
}
function routeCron(u, res, json) {
  const p = u.searchParams;
  const expr = p.get('expr') || p.get('cron') || '';
  if (!expr) return json(res, 200, { usage: '?expr=*/5 9-17 * * 1-5 — explain a 5-field cron and get next runs', fields: ['minute 0-59','hour 0-23','day-of-month 1-31','month 1-12','day-of-week 0-6 (0=Sun)'] });
  const f = expr.trim().split(/\s+/);
  if (f.length !== 5) return json(res, 422, { error: 'expected exactly 5 fields', input: expr, got_fields: f.length });
  const mn = parseField(f[0],0,59), hh = parseField(f[1],0,23), dm = parseField(f[2],1,31);
  const uc = s => s.toUpperCase(); const mo = parseField(f[3].toUpperCase(),1,12,{JAN:1,FEB:2,MAR:3,APR:4,MAY:5,JUN:6,JUL:7,AUG:8,SEP:9,OCT:10,NOV:11,DEC:12}); const dw = parseField(f[4].toUpperCase(),0,6,{SUN:0,MON:1,TUE:2,WED:3,THU:4,FRI:5,SAT:6});
  const bad = [mn,hh,dm,mo,dw].some(s => s === null);
  if (bad) return json(res, 422, { error: 'invalid field syntax', input: expr });
  const domStar = f[2] === '*', dowStar = f[4] === '*';
  // next runs: scan minutes from now
  const runs = []; let t = new Date(); t.setSeconds(0,0); t.setMinutes(t.getMinutes()+1);
  while (runs.length < 3 && t.getTime() - Date.now() < 366*24*3600*1000) {
    if (mn.has(t.getMinutes()) && hh.has(t.getHours()) && mo.has(t.getMonth()+1)
        && (domStar && dowStar ? true
          : domStar ? dw.has(t.getDay())
          : dowStar ? dm.has(t.getDate())
          : dm.has(t.getDate()) || dw.has(t.getDay()))) {
      runs.push(t.toISOString());
      t = new Date(t.getTime() + 60000); t.setSeconds(0,0);
      // skip to next minute to avoid dup
    }
    t = new Date(t.getTime() + 60000); t.setSeconds(0,0);
    // dedupe: if we just added, this extra +1 is fine
  }
  return json(res, 200, {
    input: expr,
    fields: { minute: [...mn], hour: [...hh], day_of_month: [...dm], month: [...mo], day_of_week: [...dw] },
    next_runs_utc: runs
  });
}
module.exports = { routeCron };
