// VIN validator: 17 chars, excludes I/O/Q, transliteration + weighted checksum, WMI/year decode
const TRANS = { A:1,B:2,C:3,D:4,E:5,F:6,G:7,H:8,J:1,K:2,L:3,M:4,N:5,P:7,R:9,S:2,T:3,U:4,V:5,W:6,X:7,Y:8,Z:9 };
const WEIGHTS = [8,7,6,5,4,3,2,10,0,9,8,7,6,5,4,3,2];
function yearCode(c, modelYear) {
  const codes = 'ABCDEFGHJKLMNPRSTVWXY123456789';
  const idx = codes.indexOf(c);
  if (idx < 0) return null;
  let yr = 1980 + idx;
  while (modelYear && yr + 30 <= modelYear) yr += 30; // >30yr cycle wrap
  return yr;
}
function regions(wmi) {
  const f = wmi[0];
  if ('12345'.includes(f)) return 'North America';
  if ('JKLMN'.includes(f)) return 'Asia';
  if ('STUVWXYZ'.includes(f)) return 'Europe';
  if (f === '6') return 'Oceania';
  if (f === '8' || f === '9') return 'South America';
  if (f === '7') return 'New Zealand/Australia region';
  if (f === '0') return 'Africa';
  return 'unknown';
}
function validate(input) {
  const v = String(input || '').toUpperCase().replace(/[\s-]/g, '');
  if (v.length !== 17) return { error: `VIN must be 17 characters, got ${v.length}` };
  if (/[^A-HJ-NPR-Z0-9]/.test(v)) return { error: 'VIN contains invalid characters (I, O, Q are never used)' };
  const out = { vin: v, wmi: v.slice(0, 3), vds: v.slice(3, 9), vis: v.slice(9, 17), region: regions(v.slice(0, 3)) };
  // checksum: position 9 (index 8)
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const c = v[i];
    const val = /\d/.test(c) ? +c : TRANS[c];
    sum += val * WEIGHTS[i];
  }
  const rem = sum % 11;
  const expected = rem === 10 ? 'X' : String(rem);
  out.checkDigitProvided = v[8];
  out.checkDigitExpected = expected;
  out.checksumValid = v[8] === expected;
  const my = v[9] !== '0' ? yearCode(v[9], null) : null;
  out.modelYearCode = v[9];
  if (v[9] !== '0') out.modelYearApprox = my;
  if (/^[9A-HJ-NPR-Z]/.test(v[6])) out.note = 'this VIN may use a flat-rate check convention (non-North-American WMI)';
  out.valid = out.checksumValid;
  if (!out.valid) out.reason = `check digit mismatch: expected ${expected}, got ${v[8]}`;
  return out;
}
function routeVin(u, res, json) {
  const q = Object.fromEntries(new URL(u, 'http://x').searchParams);
  if (!q.vin) return json(res, 400, { error: 'missing ?vin= parameter' });
  return json(res, 200, validate(q.vin));
}
module.exports = { routeVin, validate };
