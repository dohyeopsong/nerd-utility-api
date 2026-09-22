// /duration — parse ISO-8601 duration / human strings, convert units, format
const UNITS = {
  ms: 1, millisecond: 1, milliseconds: 1,
  s: 1000, sec: 1000, second: 1000, seconds: 1000,
  m: 60000, min: 60000, minute: 60000, minutes: 60000,
  h: 3600000, hr: 3600000, hour: 3600000, hours: 3600000,
  d: 86400000, day: 86400000, days: 86400000,
  w: 604800000, week: 604800000, weeks: 604800000,
  y: 31536000000, year: 31536000000, years: 31536000000 // 365d
};
function parseIsoDuration(s) {
  const m = s.match(/^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/);
  if (!m) return null;
  const [y, mo, w, d, h, mi, sec] = m.slice(1).map(x => x ? parseFloat(x) : 0);
  if (m[0] === 'P') return null;
  const ms = y*31536000000 + mo*2592000000 + w*604800000 + d*86400000 + h*3600000 + mi*60000 + sec*1000;
  return { ms, years: y, months: mo, weeks: w, days: d, hours: h, minutes: mi, seconds: sec };
}
function parseHuman(s) {
  // e.g. "1h 30m", "2 days 4 hours", "90s"
  const re = /(\d+(?:\.\d+)?)\s*(ms|milliseconds?|s|seconds?|secs?|m|minutes?|mins?|h|hours?|hrs?|d|days?|w|weeks?|y|years?)/gi;
  let ms = 0, found = false;
  let match;
  while ((match = re.exec(s)) !== null) {
    found = true;
    let unit = match[2].toLowerCase();
    // normalize short forms
    const norm = { sec:'s', secs:'s', min:'m', mins:'m', hr:'h', hrs:'h' }[unit] || unit;
    unit = norm.replace(/s$/, (t, k) => ['ms','s','m','h','d','w','y'].includes(norm) ? norm : norm);
    const factor = UNITS[norm] || UNITS[norm.replace(/s$/, '')] || UNITS[{ secondes: 's' }[norm] || norm];
    if (!factor) return null;
    ms += parseFloat(match[1]) * factor;
  }
  return found ? ms : null;
}
function fmt(ms) {
  const parts = [];
  const units = [['y', 31536000000], ['w', 604800000], ['d', 86400000], ['h', 3600000], ['m', 60000], ['s', 1000], ['ms', 1]];
  let rem = ms;
  for (const [sym, val] of units) {
    if (rem >= val) {
      const n = Math.floor(rem / val);
      parts.push(n + sym);
      rem -= n * val;
    }
  }
  return parts.length ? parts.join(' ') : '0ms';
}
function routeDuration(u, res, json) {
  const q = u.searchParams;
  const input = (q.get('input') || q.get('duration') || q.get('from') || '').trim();
  if (!input) return json(res, 400, { error: 'input required (ISO-8601 duration or human duration)' });
  const iso = input.startsWith('P') ? parseIsoDuration(input) : null;
  const humanMs = iso ? null : parseHuman(input);
  const ms = iso ? iso.ms : humanMs;
  if (ms === null || ms === undefined) return json(res, 400, { error: 'could not parse: ' + input });
  const out = {
    input, ms,
    human: fmt(ms),
    seconds: ms / 1000,
    minutes: ms / 60000,
    hours: ms / 3600000,
    days: ms / 86400000,
    weeks: ms / 604800000,
    years: ms / 31536000000
  };
  if (iso) {
    out.iso = { years: iso.years, months: iso.months, weeks: iso.weeks, days: iso.days, hours: iso.hours, minutes: iso.minutes, seconds: iso.seconds };
  }
  return json(res, 200, out);
}
module.exports = { routeDuration };
