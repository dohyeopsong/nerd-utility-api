// /vin?number=1HGCM82633A004352 → VIN validator/decoder: check digit, WMI, region, model year
const REGION = { A:'Africa', B:'Africa', C:'Africa', D:'Africa', E:'Africa', F:'Africa', G:'Africa', H:'Africa', J:'Asia', K:'Asia', L:'Asia', M:'Asia', N:'Asia', P:'Asia', R:'Asia', S:'Europe', T:'Europe', U:'Europe', V:'Europe', W:'Europe', X:'Europe', Y:'Europe', Z:'Europe', 1:'North America', 2:'North America', 3:'North America', 4:'North America', 5:'North America', 6:'Oceania', 7:'Oceania', 8:'South America', 9:'South America', 0:'South America' };
const TRANSLIT = { A:1,B:2,C:3,D:4,E:5,F:6,G:7,H:8,J:1,K:2,L:3,M:4,N:5,P:7,R:9,S:2,T:3,U:4,V:5,W:6,X:7,Y:8,Z:9 };
const WEIGHTS = [8,7,6,5,4,3,2,10,0,9,8,7,6,5,4,3,2];
const YEAR_CODES = 'ABCDEFGHJKLMNPRSTVWXY123456789';
const WMI_NOTES = { '1HG':'Honda (USA)', '1FT':'Ford (USA)', '1GC':'Chevrolet (USA)', '1G1':'Chevrolet (USA)', '2HG':'Honda (Canada)', '3FA':'Ford (Mexico)', 'JHM':'Honda (Japan)', 'JT':'Toyota (Japan)', 'WBA':'BMW (Germany)', 'WDB':'Mercedes-Benz (Germany)', 'WVW':'Volkswagen (Germany)', 'WAU':'Audi (Germany)', 'ZFA':'Fiat (Italy)', 'VF1':'Renault (France)', 'VS':'Spain', 'KNA':'Kia (Korea)', 'KMH':'Hyundai (Korea)' };
function routeVin(u, res, json) {
  const raw = u.searchParams.get('number') || u.searchParams.get('vin');
  if (!raw) return json(res, 400, { error: 'pass number=<17-char VIN>, e.g. /vin?number=1HGCM82633A004352' });
  const vin = raw.toUpperCase().replace(/\s+/g, '');
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) return json(res, 400, { error: 'invalid VIN: must be 17 chars, no I/O/Q' });

  // check digit (position 9, weight 0)
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const v = TRANSLIT[vin[i]] !== undefined ? TRANSLIT[vin[i]] : +vin[i];
    sum += v * WEIGHTS[i];
  }
  const remainder = sum % 11;
  const expected = remainder === 10 ? 'X' : String(remainder);
  const checkOk = vin[8] === expected;

  const yearChar = vin[9];
  const modelYear = YEAR_CODES.indexOf(yearChar);
  // year code cycles every 30 years; 2010-2039 window
  let year = null;
  if (modelYear >= 0) {
    year = 2010 + modelYear;
    if (year > new Date().getFullYear() + 1) year -= 30;
  }
  const wmi = vin.slice(0, 3);
  const wmiNote = Object.keys(WMI_NOTES).map(k => wmi.startsWith(k) ? WMI_NOTES[k] : null).filter(Boolean)[0] || null;

  return json(res, 200, {
    vin,
    valid: checkOk,
    checkDigit: vin[8],
    expectedCheckDigit: expected,
    wmi,
    manufacturer: wmiNote,
    vds: vin.slice(3, 9),
    vis: vin.slice(9),
    region: REGION[vin[0]] || null,
    countryDigit: vin[0],
    modelYearChar: yearChar,
    modelYear: year,
    serialNumber: vin.slice(11),
    plantCode: vin[10]
  });
}
module.exports = { routeVin };
