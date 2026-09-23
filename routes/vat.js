// /vat — EU VAT number validation (format + mod-97 checksum for many countries)
const RE = {
  AT: /^ATU\d{8}$/, BE: /^BE0\d{9}$/, BG: /^BG\d{9,10}$/, CY: /^CY\d{8}[A-Z]$/,
  CZ: /^CZ\d{8,10}$/, DE: /^DE\d{9}$/, DK: /^DK\d{8}$/, EE: /^EE\d{9}$/,
  ES: /^ES[A-Z0-9]\d{7}[A-Z0-9]$/, FI: /^FI\d{8}$/, FR: /^FR[A-Z0-9]{2}\d{9}$/,
  GB: /^GB\d{9}$/, GR: /^EL\d{9}$/, HR: /^HR\d{11}$/, HU: /^HU\d{8}$/,
  IE: /^IE[A-Z0-9]{8,9}$/, IT: /^IT\d{11}$/, LT: /^LT\d{9,12}$/, LU: /^LU\d{8}$/,
  LV: /^LV\d{11}$/, MT: /^MT\d{8}$/, NL: /^NL\d{9}B\d{2}$/, PL: /^PL\d{10}$/,
  PT: /^PT\d{9}$/, RO: /^RO\d{2,10}$/, SE: /^SE\d{10}$/, SI: /^SI\d{8}$/,
  SK: /^SK\d{10}$/
};

// mod-97 countries: ISO 7064 Mod 97,10 (as used by IBAN-style checks)
const MOD97 = new Set(['BE', 'DE', 'EE', 'FI', 'GR', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PL', 'PT', 'SE', 'SI', 'SK']);

function mod97(numStr) {
  let rem = 0;
  for (const c of numStr) {
    rem = (rem * 10 + Number(c)) % 97;
  }
  return rem;
}

function routeVat(u, res, json) {
  const p = u.searchParams;
  const vat = (p.get('vat') || p.get('v') || '').toUpperCase().replace(/[\s.-]/g, '');

  if (!vat) {
    return json(res, 200, { usage: '?vat=DE123456789 — validate EU VAT number format and checksum' });
  }

  const cc = vat.slice(0, 2);
  const body = vat.slice(2);
  const re = RE[cc];

  if (!re) return json(res, 400, { vat, error: `unknown/unsupported country code '${cc}'` });
  if (!re.test(vat)) return json(res, 400, { vat, country: cc, error: 'invalid format for ' + cc });

  let checksumOk = null;
  if (MOD97.has(cc)) {
    checksumOk = mod97(body) === 97; // remainder must be 97 for valid numbers
  }

  return json(res, 200, {
    vat, country: cc, formatOk: true,
    checksumVerified: checksumOk !== null,
    checksumOk,
    note: checksumOk === false ? 'format valid, checksum failed' : 'offline validation only — full VIES check requires the EU API'
  });
}

module.exports = { routeVat };
