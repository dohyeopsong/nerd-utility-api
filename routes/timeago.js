// Relative-time formatter: unix epoch or ISO date -> "3 hours ago" / "in 2 days"
function parseDate(s) {
  if (!s) return null;
  const t = String(s).trim();
  if (/^\d{10}$/.test(t)) return new Date(+t * 1000);
  if (/^\d{13}$/.test(t)) return new Date(+t);
  const d = new Date(t);
  return isNaN(d) ? null : d;
}
const UNITS = [
  [31557600000, 'year', 'years'], [2629800000, 'month', 'months'],
  [604800000, 'week', 'weeks'], [86400000, 'day', 'days'],
  [3600000, 'hour', 'hours'], [60000, 'minute', 'minutes'], [1000, 'second', 'seconds']
];
function relative(d, now = new Date()) {
  const diff = d.getTime() - now.getTime();
  const abs = Math.abs(diff);
  if (abs < 500) return 'just now';
  for (const [ms, one, many] of UNITS) {
    if (abs >= ms) {
      const n = Math.floor(abs / ms);
      const s = n === 1 ? one : many;
      return diff > 0 ? `in ${n} ${s}` : `${n} ${s} ago`;
    }
  }
  return 'just now';
}
function routeTimeago(u, res, json) {
  const q = Object.fromEntries(new URL(u, 'http://x').searchParams);
  const d = parseDate(q.time || q.t || q.date);
  if (!d) return json(res, 400, { error: 'missing/invalid ?time= (unix seconds, ms, or ISO date)' });
  const now = q.now ? (parseDate(q.now) || new Date()) : new Date();
  return json(res, 200, {
    input: q.time || q.t || q.date, date: d.toISOString(), unix: Math.floor(d.getTime() / 1000),
    relative: relative(d, now), direction: d > now ? 'future' : 'past'
  });
}
module.exports = { routeTimeago, relative, parseDate };
