// /datediff — difference between two dates
function parseDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error(`invalid date: ${s} (expected YYYY-MM-DD)`);
  const d = new Date(s + 'T00:00:00Z');
  if (isNaN(d.getTime())) throw new Error(`invalid date: ${s}`);
  if (d.toISOString().slice(0, 10) !== s) throw new Error(`invalid date: ${s}`);
  return d;
}

function routeDatediff(u, res, json) {
  const q = u.searchParams;
  const fromStr = q.get('from');
  const toStr = q.get('to') || new Date().toISOString().slice(0, 10);

  try {
    if (!fromStr) throw new Error('missing from parameter');
    const from = parseDate(fromStr);
    const to = parseDate(toStr);

    const msPerDay = 86400000;
    const days = Math.round((to - from) / msPerDay);

    // calendar-aware breakdown
    let fy = from.getUTCFullYear(), fm = from.getUTCMonth(), fd = from.getUTCDate();
    let ty = to.getUTCFullYear(), tm = to.getUTCMonth(), td = to.getUTCDate();
    let years = ty - fy, months = tm - fm, mdays = td - fd;
    if (mdays < 0) { months--; mdays += new Date(Date.UTC(ty, tm, 0)).getUTCDate(); }
    if (months < 0) { years--; months += 12; }
    // negative total direction
    const negative = days < 0;

    return json(res, 200, {
      from: fromStr,
      to: toStr,
      days,
      weeks: +(days / 7).toFixed(2),
      months: years * 12 + months,
      years_months_days: { years: negative ? -years : years, months: negative ? -months : months, days: negative ? -mdays : mdays },
      direction: negative ? 'past' : days === 0 ? 'same' : 'future',
      weekdays: Math.round(Math.abs(days) / 7) * 5 + 0,
    });
  } catch (e) {
    return json(res, 400, { error: e.message, example: '/datediff?from=2024-01-01&to=2025-01-01' });
  }
}
module.exports = { routeDatediff };
