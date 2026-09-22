// /vin — VIN validation: 17-char format, North American check digit, decode WMI year plant
const TRANS = { A:1,B:2,C:3,D:4,E:5,F:6,G:7,H:8,J:1,K:2,L:3,M:4,N:5,P:7,R:9,S:2,T:3,U:4,V:5,W:6,X:7,Y:8,Z:9,
  0:0,1:1,2:2,3:3,4:4,5:5,6:6,7:7,8:8,9:9 };
const WEIGHTS = [8,7,6,5,4,3,2,10,0,9,8,7,6,5,4,3,2];
const YEAR_CODES = { A:2010,B:2011,C:2012,D:2013,E:2014,F:2015,G:2016,H:2017,J:2018,K:2019,L:2020,M:2021,N:2022,P:2023,R:2024,S:2025,T:2026,V:2027,W:2028,X:2029,Y:2030,
  1:2031,2:2032,3:2033,4:2034,5:2035,6:2036,7:2037,8:2038,9:2039 };

function routeVin(u, res, json) {
  const q = u.searchParams;
  const raw = q.get('vin');
  if (!raw) return json(res, 400, { error: 'provide ?vin=', example: '/vin?vin=1M8GDM9AXKP042788' });
  const v = raw.toUpperCase().replace(/[\s-]/g, '');

  if (v.length !== 17) return json(res, 200, { vin: v, valid: false, reason: 'VIN must be exactly 17 chars', length: v.length });
  if (/[^A-HJ-NPR-Z0-9]/.test(v))
    return json(res, 200, { vin: v, valid: false, reason: 'contains invalid chars (I, O, Q not allowed)' });

  const result = {
    vin: v, valid: true,
    wmi: v.slice(0, 3),      // world manufacturer identifier
    vds: v.slice(3, 9),       // vehicle descriptor section
    vis: v.slice(9),          // vehicle indicator section
    check_digit: v[8],
    model_year: YEAR_CODES[v[9]] || null,
    plant_code: v[10],
  };

  // check digit (required for North America: first char 1-5; optional elsewhere)
  let sum = 0;
  for (let i = 0; i < 17; i++) sum += TRANS[v[i]] * WEIGHTS[i];
  const expected = sum % 11 === 10 ? 'X' : String(sum % 11);
  result.expected_check_digit = expected;
  result.check_digit_ok = v[8] === expected;

  const na = /^[1-5]/.test(v) || /^[A-HJ-NPR-Z]/.test(v) === false; // simplistic NA heuristic: leading 1-5
  const naVin = /^[1-5]/.test(v);
  result.check_digit_required = naVin;
  if (naVin && !result.check_digit_ok) {
    result.valid = false;
    result.reason = 'check digit mismatch (required for North American VINs)';
  }
  return json(res, 200, result);
}

module.exports = { routeVin };
