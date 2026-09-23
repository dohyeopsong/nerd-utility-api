// /leap — leap year check + calendar utilities
function isLeap(y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }

function routeLeap(u, res, json) {
  const p = u.searchParams;
  const yearStr = p.get('year');
  if (!yearStr) {
    const now = new Date();
    return json(res, 200, { usage: '?year=2024 — leap check, ?next=1 — next leap year from now', current_year: now.getUTCFullYear(), current_is_leap: isLeap(now.getUTCFullYear()) });
  }
  const year = parseInt(yearStr, 10);
  if (!Number.isInteger(year) || year < 1 || year > 9999) return json(res, 400, { error: 'year must be 1..9999' });
  const leap = isLeap(year);
  const out = {
    year,
    is_leap: leap,
    days_in_year: leap ? 366 : 365,
    days_in_february: leap ? 29 : 28,
  };
  if (p.get('next')) {
    let n = year + 1;
    while (!isLeap(n)) n++;
    out.next_leap_year = n;
  }
  if (p.get('list')) {
    const count = Math.min(50, Math.max(1, parseInt(p.get('list'), 10) || 10));
    const list = []; let n = year;
    while (list.length < count) { if (isLeap(n)) list.push(n); n++; }
    out.next_leap_years = list;
  }
  return json(res, 200, out);
}
module.exports = { routeLeap };
