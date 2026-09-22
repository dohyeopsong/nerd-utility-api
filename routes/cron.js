// /cron — cron expression parsing, description, and next-run calculation
// Supports standard 5-field cron: min hour dom month dow
const MONTHS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
const DAYS = ['sun','mon','tue','wed','thu','fri','sat'];

function parseField(expr, min, max, names) {
  // returns sorted array of allowed values, or throws
  const out = new Set();
  for (const part of expr.split(',')) {
    let step = 1;
    let range = part;
    const slash = part.split('/');
    if (slash.length === 2) { range = slash[0]; step = parseInt(slash[1], 10); if (!(step >= 1)) throw new Error('bad step: ' + part); }
    let lo = min, hi = max;
    if (range !== '*' && range !== '?') {
      const m = range.match(/^(\w+)-(\w+)$/);
      if (m) {
        lo = norm(m[1], names); hi = norm(m[2], names);
        if (lo === null || hi === null) throw new Error('bad range: ' + range);
      } else {
        const v = norm(range, names);
        if (v === null) throw new Error('bad value: ' + range);
        lo = v; hi = v;
      }
    }
    if (lo < min || hi > max || lo > hi) throw new Error('out of range: ' + expr);
    for (let v = lo; v <= hi; v += step) out.add(v);
  }
  return [...out].sort((a, b) => a - b);
}

function norm(tok, names) {
  if (/^\d+$/.test(tok)) return parseInt(tok, 10);
  if (names) {
    const i = names.indexOf(tok.toLowerCase());
    if (i >= 0) return i === 0 && names === DAYS ? 0 : i; // sun=0 for dow; jan=1 for months
    if (names === MONTHS) return null;
    if (names === DAYS) return null;
  }
  return null;
}

function matches(d, f) {
  const dom = f[2], mon = f[3], dow = f[4];
  const mMin = f[0].includes(d.getMinutes()), mHour = f[1].includes(d.getHours());
  const mDom = dom.includes(d.getDate()), mMon = mon.includes(d.getMonth() + 1);
  let mDow = dow.includes(d.getDay());
  // cron quirk: if both dom and dow are restricted, OR them
  const domRestricted = !(dom.length === 31);
  const dowRestricted = !(dow.length === 7);
  let dayMatch;
  if (domRestricted && dowRestricted) dayMatch = mDom || mDow;
  else dayMatch = mDom && mDow;
  return mMin && mHour && dayMatch && mMon;
}

function nextRun(fields, from) {
  const d = new Date(from.getTime());
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() + 1);
  for (let i = 0; i < 366 * 24 * 60; i++) { // search up to ~1 year of minutes
    if (matches(d, fields)) return new Date(d.getTime());
    d.setMinutes(d.getMinutes() + 1);
  }
  return null;
}

function describe(fields) {
  const [min, hour, dom, mon, dow] = fields;
  const every = (a, n, max) => a.length === max ? 'every ' + n : null;
  const bits = [];
  bits.push(every(min, 'minute', 60) || 'minutes: ' + (min.length > 12 ? min.length + ' values' : min.join(',')));
  bits.push(every(hour, 'hour', 24) || 'hours: ' + (hour.length > 12 ? hour.length + ' values' : hour.join(',')));
  if (dom.length < 31) bits.push('days-of-month: ' + dom.join(','));
  if (mon.length < 12) bits.push('months: ' + mon.map(m => MONTHS[m - 1]).join(','));
  if (dow.length < 7) bits.push('days-of-week: ' + dow.map(x => DAYS[x]).join(','));
  return bits.join('; ');
}

function routeCron(u, res, json) {
  const q = u.searchParams;
  const expr = (q.get('expr') || '').trim();
  const count = Math.min(parseInt(q.get('count') || '3', 10) || 3, 10);

  if (!expr) {
    return json(res, 400, {
      error: 'provide ?expr=*/5 * * * *',
      note: 'Standard 5-field cron: minute hour day-of-month month day-of-week'
    });
  }

  let fields;
  try {
    const parts = expr.split(/\s+/);
    if (parts.length !== 5) throw new Error('expected 5 fields, got ' + parts.length);
    fields = [
      parseField(parts[0], 0, 59),
      parseField(parts[1], 0, 23),
      parseField(parts[2], 1, 31),
      parseField(parts[3], 1, 12, MONTHS.map((m, i) => m)), // names map jan->1
      parseField(parts[4], 0, 6, DAYS)
    ];
    // fix month norm: our norm() returns index; for months jan must equal 1
    if (parts[3] && MONTHS.includes(parts[3].toLowerCase())) { /* handled below via custom */ }
  } catch (e) {
    return json(res, 200, { valid: false, error: e.message });
  }

  // months with names: reparse with mapping jan=1..dec=12
  const part3 = expr.split(/\s+/)[3];
  if (/[a-z]/i.test(part3)) {
    try {
      const vals = parseFieldNamed(part3, 1, 12, MONTHS);
      fields[3] = vals;
    } catch (e) { return json(res, 200, { valid: false, error: e.message }); }
  }

  const runs = [];
  let t = new Date();
  for (let i = 0; i < count; i++) {
    const nr = nextRun(fields, t);
    if (!nr) break;
    runs.push(nr.toISOString());
    t = nr;
  }

  return json(res, 200, {
    valid: true,
    expression: expr,
    description: describe(fields),
    next_runs: runs,
    timezone: 'UTC'
  });
}

// month names: jan=1 ... dec=12; day names: sun=0 ... sat=6
function parseFieldNamed(expr, min, max, names) {
  const out = new Set();
  for (const part of expr.split(',')) {
    let step = 1, range = part;
    const slash = part.split('/');
    if (slash.length === 2) { range = slash[0]; step = parseInt(slash[1], 10); }
    let lo = min, hi = max;
    if (range !== '*' && range !== '?') {
      const m = range.match(/^(\w+)-(\w+)$/);
      if (m) { lo = namedVal(m[1], names); hi = namedVal(m[2], names); }
      else { lo = hi = namedVal(range, names); }
    }
    if (lo === null || hi === null || lo < min || hi > max || lo > hi) throw new Error('bad field: ' + expr);
    for (let v = lo; v <= hi; v += step) out.add(v);
  }
  return [...out].sort((a, b) => a - b);
}

function namedVal(tok, names) {
  if (/^\d+$/.test(tok)) return parseInt(tok, 10);
  const i = names.indexOf(tok.toLowerCase());
  return i >= 0 ? i + (names === MONTHS ? 1 : 0) : null;
}

module.exports = { routeCron };
