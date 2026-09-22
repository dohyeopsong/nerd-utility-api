// routes/timediff.js — difference between two dates
// GET /timediff?from=2024-01-01&to=2025-03-15  (also unix seconds/ms, "now")
function parseDate(s) {
  if (s === 'now') return Date.now();
  if (/^\d{13}$/.test(s)) return +s;               // unix ms
  if (/^\d{10}$/.test(s)) return +s * 1000;        // unix s
  const t = Date.parse(s);
  if (isNaN(t)) throw new Error(`unparseable date: '${s}' (use ISO 8601, unix s/ms, or 'now')`);
  return t;
}
function routeTimediff(u, res, json) {
  const q = u.searchParams;
  try {
    const from = q.get('from'), to = q.get('to');
    if (!from || !to) return json(res, 400, { error: 'provide from= and to=' });
    const t1 = parseDate(from), t2 = parseDate(to);
    const ms = t2 - t1;
    const abs = Math.abs(ms);
    const past = ms < 0;
    const totalDays = abs / 86400000;
    // calendar-accurate breakdown
    const d1 = new Date(Math.min(t1, t2)), d2 = new Date(Math.max(t1, t2));
    let years = d2.getFullYear() - d1.getFullYear();
    let months = d2.getMonth() - d1.getMonth();
    let days = d2.getDate() - d1.getDate();
    if (days < 0) { months--; days += new Date(d2.getFullYear(), d2.getMonth(), 0).getDate(); }
    if (months < 0) { years--; months += 12; }
    return json(res, 200, {
      from: new Date(t1).toISOString(), to: new Date(t2).toISOString(),
      fromIsEarlier: !past, direction: past ? 'from is after to' : 'from is before to',
      milliseconds: ms, totalSeconds: abs/1000, totalMinutes: abs/60000,
      totalHours: abs/3600000, totalDays, totalWeeks: totalDays/7,
      calendar: { years, months, days },
      businessDaysApprox: Math.round(totalDays * 5/7),
      human: `${years ? years + 'y ' : ''}${months ? months + 'mo ' : ''}${days}d`
    });
  } catch (e) { return json(res, 400, { error: e.message }); }
}
module.exports = { routeTimediff };
