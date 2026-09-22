// routes/duration.js — ISO 8601 duration parse/format + humanize
// GET /duration?iso=PT1H30M | ?seconds=5400 | ?parse=1h30m
function parseISODuration(s) {
  const m = /^(-)?P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/.exec(s);
  if (!m) throw new Error('invalid ISO 8601 duration');
  const [, neg, Y, Mo, W, D, H, Mi, S] = m;
  const y = +(Y||0), mo = +(Mo||0), w = +(W||0), d = +(D||0), h = +(H||0), mi = +(Mi||0), sec = +(S||0);
  // ISO months are nominal; approximate using 30.4375 days
  const totalSec = neg ? -1 : 1 * 0 + ((y*365.25 + mo*30.4375 + w*7 + d) * 86400 + h*3600 + mi*60 + sec) * (neg ? -1 : 1);
  return { neg: !!neg, years: y, months: mo, weeks: w, days: d, hours: h, minutes: mi, seconds: sec, totalSeconds: totalSec };
}
function routeDuration(u, res, json) {
  const q = u.searchParams;
  const iso = q.get('iso'), parse = q.get('parse'), secs = q.get('seconds');
  try {
    if (iso) {
      const d = parseISODuration(iso);
      return json(res, 200, { ...d, iso: iso.toUpperCase(), human: humanize(d.totalSeconds) });
    }
    if (parse) {
      // simple human format: 1h30m, 2d 4h, 90s, 45m
      const m = /^([\d.]+)\s*(y|mo|w|d|h|m|s|ms)$/i.exec(parse.trim());
      if (!m) throw new Error("format: <number><y|mo|w|d|h|m|s>, e.g. 90m or 1h");
      const mult = { y: 365.25*86400, mo: 30.4375*86400, w: 7*86400, d: 86400, h: 3600, m: 60, s: 1, ms: 0.001 }[m[2].toLowerCase()];
      const total = parseFloat(m[1]) * mult;
      return json(res, 200, { input: parse, totalSeconds: total, human: humanize(total) });
    }
    if (secs !== null) {
      if (!/^-?\d+(\.\d+)?$/.test(secs)) throw new Error('seconds must be numeric');
      const total = parseFloat(secs);
      const out = { seconds: total, human: humanize(total) };
      out.iso = toISO(Math.abs(total));
      return json(res, 200, out);
    }
    return json(res, 400, { error: 'provide iso=, parse=, or seconds=' });
  } catch (e) { return json(res, 400, { error: e.message }); }
}
function humanize(t) {
  if (t === 0) return '0s';
  const neg = t < 0; t = Math.abs(t);
  const parts = [];
  const units = [['y', 365.25*86400], ['mo', 30.4375*86400], ['w', 7*86400], ['d', 86400], ['h', 3600], ['m', 60], ['s', 1]];
  for (const [label, size] of units) {
    if (t >= size && parts.length < 3) { parts.push(Math.floor(t/size) + label); t %= size; }
  }
  return (neg?'-':'') + parts.join(' ');
}
function toISO(t) {
  const units = [['D', 86400], ['H', 3600], ['M', 60], ['S', 1]];
  let out = 'P';
  let emitted = false;
  for (const [label, size] of units) {
    if (t >= size) { out += Math.floor(t/size) + label; t %= size; emitted = true; }
  }
  return emitted ? out : 'PT0S';
}
module.exports = { routeDuration };
