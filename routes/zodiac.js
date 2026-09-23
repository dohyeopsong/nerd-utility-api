// /zodiac — Western and Chinese zodiac from birth date
const WEST = [
  ['Capricorn', 101, 119], ['Aquarius', 120, 218], ['Pisces', 219, 320], ['Aries', 321, 419],
  ['Taurus', 420, 520], ['Gemini', 521, 620], ['Cancer', 621, 722], ['Leo', 723, 822],
  ['Virgo', 823, 922], ['Libra', 923, 1022], ['Scorpio', 1023, 1121], ['Sagittarius', 1122, 1221],
];
const CN = ['Rat','Ox','Tiger','Rabbit','Dragon','Snake','Horse','Goat','Monkey','Rooster','Dog','Pig'];
const CN_ELEM = ['Metal','Metal','Water','Water','Wood','Wood','Fire','Fire','Earth','Earth'];

function westernSign(m, d) {
  const md = m * 100 + d;
  if (md >= 1222) return 'Capricorn';
  for (const [name, start, end] of WEST) if (md >= start && md <= end) return name;
  return 'Capricorn';
}

function routeZodiac(u, res, json) {
  const p = u.searchParams;
  const dateStr = p.get('date');
  if (!dateStr) return json(res, 200, { usage: '?date=1990-05-15 — Western + Chinese zodiac' });
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return json(res, 400, { error: 'date must be YYYY-MM-DD' });
  const y = +m[1], mo = +m[2], d = +m[3];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return json(res, 400, { error: 'invalid date' });

  const sign = westernSign(mo, d);
  const idx = (((y - 2020) % 12) + 12) % 12; // 2020 = Rat
  const animal = CN[idx];
  const elem = CN_ELEM[((((y - 2020) % 10) + 10) % 10)];
  return json(res, 200, {
    date: dateStr,
    western_sign: sign,
    chinese_zodiac: { animal, element: elem, year_type: elem + ' ' + animal },
  });
}
module.exports = { routeZodiac };
