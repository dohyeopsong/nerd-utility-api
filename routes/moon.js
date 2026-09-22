// /moon — moon phase for a given date (astronomical approximation, synodic month)
const SYNODIC = 29.530588853; // days
// Known new moon: 2000-01-06 18:14 UTC (JD 2451550.26)
function phase(jd) {
  let diff = (jd - 2451550.26) / SYNODIC;
  diff = diff - Math.floor(diff); // 0..1 cycle
  return diff;
}
function jdFromDate(d) { return d.getTime() / 86400000 + 2440587.5; }
const NAMES = [
  [1.8456617, 'New Moon'], [5.5369856, 'Waxing Crescent'], [9.2283086, 'First Quarter'],
  [12.9196317, 'Waxing Gibbous'], [16.6109546, 'Full Moon'], [20.3022778, 'Waning Gibbous'],
  [23.9936008, 'Last Quarter'], [27.6849240, 'Waning Crescent'], [29.612, 'New Moon'],
];
function describe(p) {
  const age = p * SYNODIC;
  for (const [lim, name] of NAMES) if (age < lim) return name;
  return 'New Moon';
}
function routeMoon(u, res, json) {
  const q = Object.fromEntries(u.searchParams.entries());
  const d = q.date ? new Date(q.date + (q.date.length === 10 ? 'T12:00:00Z' : '')) : new Date();
  if (isNaN(d)) throw new Error('invalid date, use ?date=YYYY-MM-DD');
  const jd = jdFromDate(d);
  const p = phase(jd);
  const age = +(p * SYNODIC).toFixed(2);
  const illum = +((1 - Math.cos(2 * Math.PI * p)) / 2 * 100).toFixed(1); // % illuminated
  const nextNew = new Date((jd + (1 - p) * SYNODIC - 2440587.5) * 86400000);
  const nextFull = new Date((jd + (0.5 - p + 1) % 1 * SYNODIC - 2440587.5) * 86400000);
  return json(res, 200, {
    date: d.toISOString().slice(0, 10),
    phase: describe(p),
    phaseFraction: +p.toFixed(4),
    moonAgeDays: age,
    illuminationPercent: illum,
    nextNewMoon: nextNew.toISOString().slice(0, 10),
    nextFullMoon: nextFull.toISOString().slice(0, 10),
  });
}
module.exports = { routeMoon };
