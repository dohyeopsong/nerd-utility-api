// /vin — Vehicle Identification Number validation (ISO 3779): 17 chars, transliteration, check digit
const TRANS = { A:1,B:2,C:3,D:4,E:5,F:6,G:7,H:8,J:1,K:2,L:3,M:4,N:5,P:7,R:9,S:2,T:3,U:4,V:5,W:6,X:7,Y:8,Z:9,
  0:0,1:1,2:2,3:3,4:4,5:5,6:6,7:7,8:8,9:9 };
const WEIGHTS = [8,7,6,5,4,3,2,10,0,9,8,7,6,5,4,3,2];
function routeVin(u, res, json) {
  const p = u.searchParams;
  const raw = p.get('vin');
  if (!raw) return json(res, 200, { usage: '?vin=1HGCM82633A004352 — validates VIN: length, charset, ISO 3779 check digit, parses WMI/VDS/VIS' });
  const vin = raw.trim().toUpperCase();
  if (vin.length !== 17) return json(res, 400, { error: 'VIN must be exactly 17 characters', length: vin.length });
  if (/[^A-HJ-NPR-Z0-9]/.test(vin)) return json(res, 400, { error: 'VIN contains invalid characters (I, O, Q are never used)' });
  // check digit (position 9)
  let sum = 0;
  for (let i = 0; i < 17; i++) sum += TRANS[vin[i]] * WEIGHTS[i];
  const rem = sum % 11;
  const expected = rem === 10 ? 'X' : String(rem);
  const checkOk = vin[8] === expected;
  const yearCode = vin[9];
  const yearMap = {A:2010,B:2011,C:2012,D:2013,E:2014,F:2015,G:2016,H:2017,J:2018,K:2019,L:2020,M:2021,N:2022,P:2023,R:2024,S:2025,T:2026,V:2027};
  return json(res, 200, {
    vin,
    valid: checkOk,
    check_digit: vin[8],
    expected_check_digit: expected,
    wmi: vin.slice(0, 3),
    vds: vin.slice(3, 9),
    vis: vin.slice(9),
    model_year: yearMap[yearCode] || null,
    plant_code: vin[11],
    serial: vin.slice(11),
    note: 'WMI=manufacturer, VDS=attributes, VIS=year/plant/serial. Check digit per ISO 3779.',
  });
}
module.exports = { routeVin };
