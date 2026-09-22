// /vin — Vehicle Identification Number validation (17 chars, NHTSA check digit)
const TRANS = { A:1,B:2,C:3,D:4,E:5,F:6,G:7,H:8,J:1,K:2,L:3,M:4,N:5,P:7,R:9,S:2,T:3,U:4,V:5,W:6,X:7,Y:8,Z:9 };
const WEIGHTS = [8,7,6,5,4,3,2,10,0,9,8,7,6,5,4,3,2];

function routeVin(u, res, json) {
  const q = u.searchParams;
  const raw = q.get('vin');
  if (!raw) return json(res, 400, { error: 'provide ?vin=', example: '/vin?vin=1HGBH41JXMN109186' });
  const vin = raw.trim().toUpperCase();

  if (vin.length !== 17)
    return json(res, 400, { error: 'VIN must be exactly 17 characters', length: vin.length });
  if (/[^A-HJ-NPR-Z0-9]/.test(vin))
    return json(res, 400, { error: 'VIN contains invalid characters (no I, O, Q allowed)' });

  // check digit (position 9)
  const sum = [...vin].reduce((a, c, i) => {
    const val = /[0-9]/.test(c) ? +c : TRANS[c];
    return a + val * WEIGHTS[i];
  }, 0);
  const rem = sum % 11;
  const expected = rem === 10 ? 'X' : String(rem);
  const given = vin[8];
  const valid = given === expected;

  const result = {
    vin, valid,
    check_digit_given: given, check_digit_expected: expected,
    wmi: vin.slice(0, 3),           // World Manufacturer Identifier
    vds: vin.slice(3, 9),           // Vehicle Descriptor Section
    vis: vin.slice(9),              // Vehicle Identifier Section
    model_year_candidates: modelYears(vin[9]),
    assembly_plant: vin[10],
    serial_number: vin.slice(11),
  };
  if (!valid) result.corrected_vin = vin.slice(0, 8) + expected + vin.slice(9);
  return json(res, 200, result);
}

// position 10 = year code (30-year cycle, plus secondary candidates)
function modelYears(c) {
  const codes = 'ABCDEFGHJKLMNPRSTVWXY123456789';
  const i = codes.indexOf(c);
  if (i < 0) return [];
  const years = [2010 + i, 1980 + i].filter(y => y >= 1980 && y <= 2039);
  return years;
}

module.exports = { routeVin };
