// /vin — Vehicle Identification Number validation (ISO 3779, North American rules)
// transliteration table for check digit calculation
const T = { A:1,B:2,C:3,D:4,E:5,F:6,G:7,H:8,J:1,K:2,L:3,M:4,N:5,P:7,R:9,S:2,T:3,U:4,V:5,W:6,X:7,Y:8,Z:9 };
const W = [8,7,6,5,4,3,2,10,0,9,8,7,6,5,4,3,2]; // positional weights

function routeVin(u, res, json) {
  const q = u.searchParams;
  const v = (q.get('check') || '').trim().toUpperCase();
  if (!v) return json(res, 400, { error: 'provide ?check=1HGCM82633A004352', example: '/vin?check=1HGCM82633A004352' });

  const out = { input: v, vin: v, length: v.length };

  if (v.length !== 17) {
    out.valid = false;
    out.reason = `VIN must be exactly 17 chars, got ${v.length}`;
    return json(res, 200, out);
  }
  if (/[^A-HJ-NPR-Z0-9]/.test(v)) {
    out.valid = false;
    out.reason = 'VIN contains invalid characters (I, O, Q are never allowed)';
    return json(res, 200, out);
  }

  // WMI (positions 1-3), VDS (4-9), VIS (10-17)
  out.wmi = v.slice(0, 3);
  out.vds = v.slice(3, 9);
  out.vis = v.slice(9);
  out.model_year_code = v[9];
  out.plant_code = v[10];

  // decode year
  const YEAR = { A:2010,B:2011,C:2012,D:2013,E:2014,F:2015,G:2016,H:2017,J:2018,K:2019,L:2020,M:2021,N:2022,P:2023,R:2024,S:2025,T:2026,V:2027,W:2028,X:2029,Y:2030,
                 1:2001,2:2002,3:2003,4:2004,5:2005,6:2006,7:2007,8:2008,9:2009,0:2010 };
  if (YEAR[v[9]] !== undefined) out.model_year = YEAR[v[9]];

  // country from first char
  const COUNTRY = { 1:'USA',4:'USA',5:'USA',7:'USA',2:'Canada',3:'Mexico',J:'Japan',K:'Korea',L:'China',S:'UK/Germany',V:'France/Spain',W:'Germany',Z:'Italy' };
  out.country_of_origin = COUNTRY[v[0]] || 'other';

  // check digit (position 9, index 8)
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const val = /[0-9]/.test(v[i]) ? +v[i] : T[v[i]];
    sum += val * W[i];
  }
  const rem = sum % 11;
  const expected = rem === 10 ? 'X' : String(rem);
  out.check_digit = v[8];
  out.expected_check_digit = expected;
  out.valid = v[8] === expected;
  if (!out.valid) out.reason = `check digit should be ${expected}, got ${v[8]}`;

  return json(res, 200, out);
}

module.exports = { routeVin };
