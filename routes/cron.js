// Cron expression parser/validator with human-readable description
const FIELD_NAMES = ['minute','hour','day-of-month','month','day-of-week'];
const RANGES = [[0,59],[0,23],[1,31],[1,12],[0,7]];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const ALIASES = { '@yearly':'0 0 1 1 *', '@annually':'0 0 1 1 *', '@monthly':'0 0 1 * *', '@weekly':'0 0 * * 0', '@daily':'0 0 * * *', '@midnight':'0 0 * * *', '@hourly':'0 * * * *' };

function resolveToken(tok, idx) {
  if (/^\d+$/.test(tok)) return parseInt(tok, 10);
  if (idx === 3) { const i = MONTHS.findIndex(m => m.toLowerCase().startsWith(tok.toLowerCase())); return i >= 0 ? i + 1 : null; }
  if (idx === 4) { const i = DAYS.findIndex(d => d.toLowerCase().startsWith(tok.toLowerCase())); return i >= 0 ? i : null; }
  return null;
}
function parseField(field, idx) {
  if (field === '*') return { ok: true, values: null };
  const [lo, hi] = RANGES[idx];
  const values = new Set();
  for (const part of field.split(',')) {
    const seg = part.split('/');
    const step = seg.length > 1 ? parseInt(seg[1], 10) : 1;
    const range = seg[0];
    if (!Number.isFinite(step) || step < 1) return { ok: false, error: 'invalid step in "' + part + '" (' + FIELD_NAMES[idx] + ')' };
    let start, end;
    if (range === '*') { start = lo; end = hi; }
    else if (range.includes('-')) {
      const m = range.match(/^(\w+)-(\w+)$/);
      if (!m) return { ok: false, error: 'invalid range "' + range + '"' };
      start = resolveToken(m[1], idx); end = resolveToken(m[2], idx);
      if (start === null || end === null) return { ok: false, error: 'invalid names in "' + range + '" (' + FIELD_NAMES[idx] + ')' };
    } else {
      start = end = resolveToken(range, idx);
      if (start === null) return { ok: false, error: 'invalid value "' + range + '" (' + FIELD_NAMES[idx] + ')' };
    }
    if (idx === 4) { if (start === 7) start = 0; if (end === 7) end = 0; }
    if (start < lo || start > hi || end < lo || end > hi || start > end) return { ok: false, error: 'out-of-range "' + part + '" (' + FIELD_NAMES[idx] + ', allowed ' + lo + '-' + hi + ')' };
    for (let v = start; v <= end; v += step) values.add(v);
  }
  return { ok: true, values };
}
function describe(fields) {
  const [m, h, dom, mon, dow] = fields;
  if (m === '*' && h === '*' && dom === '*' && mon === '*' && dow === '*') return 'every minute';
  if (dom === '*' && mon === '*' && dow === '*') return 'at minute ' + m + ' past hour ' + h;
  if (m === '0' && h === '0' && dom === '*' && mon === '*' && dow === '*') return 'daily at midnight';
  if (m === '0' && h === '0' && dom === '*' && mon === '*' && dow === '1') return 'weekly on Monday at midnight';
  if (m === '0' && h === '0' && dom === '1' && mon === '*' && dow === '*') return 'monthly on the 1st at midnight';
  if (m === '0' && h === '0' && dom === '1' && mon === '1' && dow === '*') return 'annually on January 1st at midnight';
  return 'minute=' + m + ', hour=' + h + ', day-of-month=' + dom + ', month=' + mon + ', day-of-week=' + dow;
}
function parse(expr) {
  let e = String(expr || '').trim();
  if (!e) return { error: 'empty expression' };
  if (e === '@reboot') return { expression: e, valid: true, description: 'runs once at system startup' };
  if (ALIASES[e]) { const base = parse(ALIASES[e]); if (base.error) return base; base.expression = e; base.alias = true; return base; }
  const fields = e.split(/\s+/);
  if (fields.length !== 5) return { error: 'expected 5 fields (minute hour day-of-month month day-of-week), got ' + fields.length };
  const parsed = [];
  for (let i = 0; i < 5; i++) {
    const r = parseField(fields[i], i);
    if (!r.ok) return { error: r.error };
    parsed.push(r.values ? [...r.values].sort((a,b)=>a-b) : '*');
  }
  return { expression: e, valid: true, fields: { minute: parsed[0], hour: parsed[1], dayOfMonth: parsed[2], month: parsed[3], dayOfWeek: parsed[4] }, description: describe(fields) };
}
function routeCron(u, res, json) {
  const q = Object.fromEntries(new URL(u, 'http://x').searchParams);
  if (!q.expr) return json(res, 400, { error: 'missing ?expr= cron expression (URL-encode spaces)' });
  return json(res, 200, parse(q.expr));
}
module.exports = { routeCron, parse };
