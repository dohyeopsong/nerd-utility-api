// /vin — VIN validation (ISO 3779): 17 chars, transliteration, check digit, WMI/VDS/VIS
function routeVin(u, res, json) {
  const p = u.searchParams;
  const raw = (p.get('vin') || p.get('v') || '').trim();
  const vin = raw.toUpperCase();

  if (!vin) return json(res, 200, { usage: '?vin=1HGCM82633A004352' });

  if (vin.length !== 17) {
    return json(res, 400, { vin: raw, error: 'VIN must be exactly 17 characters' });
  }
  if (/[^A-HJ-NPR-Z0-9]/.test(vin)) {
    return json(res, 400, { vin: raw, error: 'VIN must not contain I, O, or Q' });
  }

  // Transliteration
  const T = { A:1, B:2, C:3, D:4, E:5, F:6, G:7, H:8, J:1, K:2, L:3, M:4, N:5, P:7, R:9, S:2, T:3, U:4, V:5, W:6, X:7, Y:8, Z:9 };
  const W = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const c = vin[i];
    const v = /[0-9]/.test(c) ? Number(c) : T[c];
    sum += v * W[i];
  }
  const r = sum % 11;
  const expected = r === 10 ? 'X' : String(r);
  const checkValid = vin[8] === expected;

  const yearCodes = { A:2010, B:2011, C:2012, D:2013, E:2014, F:2015, G:2016, H:2017, J:2018, K:2019, L:2020, M:2021, N:2022, P:2023, R:2024, S:2025, T:2026, V:2027, W:1988, X:1999, Y:2000, '1':2001, '2':2002, '3':2003, '4':2004, '5':2005, '6':2006, '7':2007, '8':2008, '9':2009 };

  return json(res, 200, {
    vin,
    valid: checkValid,
    checkDigit: vin[8],
    expectedCheckDigit: expected,
    wmi: vin.slice(0, 3),
    vds: vin.slice(3, 9),
    vis: vin.slice(9),
    modelYear: yearCodes[vin[9]] !== undefined ? yearCodes[vin[9]] : null,
    note: 'check digit is position 9 (index 8); year code position 10 is ambiguous across 30-year cycles'
  });
}

module.exports = { routeVin };
