// /vin — Vehicle Identification Number validation (17 chars, ISO 3779 check digit, year/region decode)
const TRANS = { A:1,B:2,C:3,D:4,E:5,F:6,G:7,H:8,J:1,K:2,L:3,M:4,N:5,P:7,R:9,S:2,T:3,U:4,V:5,W:6,X:7,Y:8,Z:9 };
const WEIGHTS = [8,7,6,5,4,3,2,10,0,9,8,7,6,5,4,3,2];
const YEAR_CODES = { A:2010,B:2011,C:2012,D:2013,E:2014,F:2015,G:2016,H:2017,J:2018,K:2019,L:2020,M:2021,N:2022,P:2023,R:2024,S:2025,T:2026,V:2027,W:2028,X:2029,Y:2030 };
const REGION = { 1:'North America',2:'North America',3:'North America',4:'North America',5:'North America',6:'Oceania',7:'Oceania',8:'South America',9:'South America',J:'Asia',K:'Asia',L:'Asia',M:'Asia',N:'Asia',P:'Asia',R:'Asia',S:'Europe',T:'Europe',U:'Europe',V:'Europe',W:'Europe',X:'Europe',Y:'Europe',Z:'Europe (Italy)' };

function routeVin(u, res, json) {
  const q = u.searchParams;
  const check = q.get('check');
  if (!check) return json(res, 400, { error: 'provide ?check=VIN', example: '/vin?check=1HGCM82633A004352' });
  const s = check.toUpperCase().trim();
  const out = { vin: s, valid: false };

  if (s.length !== 17) { out.reason = `VIN must be exactly 17 chars, got ${s.length}`; return json(res, 200, out); }
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(s)) { out.reason = 'invalid chars: I, O, Q are never used in VINs'; return json(res, 200, out); }
  if (/[^A-Z0-9]/.test(s)) { out.reason = 'alphanumeric only'; return json(res, 200, out); }

  // North American VINs (region 1-5) carry a check digit at position 9
  const first = s[0];
  out.region = REGION[first];
  out.check_digit = s[8];

  // compute expected check digit
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const v = /[0-9]/.test(s[i]) ? +s[i] : TRANS[s[i]];
    sum += v * WEIGHTS[i];
  }
  const rem = sum % 11;
  const expected = rem === 10 ? 'X' : String(rem);
  out.expected_check_digit = expected;
  out.checksum_ok = expected === s[8];

  // year code (position 10) — 30-year cycle
  const yc = s[9];
  if (YEAR_CODES[yc]) {
    out.model_year = YEAR_CODES[yc];
    out.model_year_alt = YEAR_CODES[yc] - 30; // previous cycle
  }

  out.valid = true;
  if (!out.checksum_ok && /^[1-5]/.test(s)) {
    out.reason = 'check digit mismatch (position 9) for North American VIN';
    // still structurally valid, but flag it
  }
  return json(res, 200, out);
}

module.exports = { routeVin };
