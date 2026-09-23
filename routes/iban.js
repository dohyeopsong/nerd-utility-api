// /iban — IBAN validation: mod-97 checksum (ISO 7064), country length/structure rules
// Source of rules: official IBAN registry lengths + basic BBAN structure patterns
const COUNTRY_RULES = {
  AD: { len: 24, pattern: /^AD\d{2}\d{4}\d{4}[A-Z0-9]{12}$/ },
  AE: { len: 23, pattern: /^AE\d{2}\d{3}\d{16}$/ },
  AL: { len: 28, pattern: /^AL\d{2}\d{8}[A-Z0-9]{16}$/ },
  AT: { len: 20, pattern: /^AT\d{2}\d{16}$/ },
  AU: { len: 0, pattern: null }, // not IBAN country
  AZ: { len: 28, pattern: /^AZ\d{2}[A-Z]{4}[A-Z0-9]{20}$/ },
  BA: { len: 20, pattern: /^BA\d{2}\d{16}$/ },
  BE: { len: 16, pattern: /^BE\d{2}\d{12}$/ },
  BG: { len: 22, pattern: /^BG\d{2}[A-Z]{4}\d{6}[A-Z0-9]{8}$/ },
  BH: { len: 22, pattern: /^BH\d{2}[A-Z]{4}[A-Z0-9]{14}$/ },
  BR: { len: 29, pattern: /^BR\d{2}\d{23}[A-Z]{1}[A-Z0-9]{1}$/ },
  BY: { len: 28, pattern: /^BY\d{2}[A-Z0-9]{4}\d{4}[A-Z0-9]{16}$/ },
  CH: { len: 21, pattern: /^CH\d{2}\d{12}[A-Z0-9]{1}$/ },
  CR: { len: 22, pattern: /^CR\d{2}\d{18}$/ },
  CY: { len: 28, pattern: /^CY\d{2}\d{8}[A-Z0-9]{16}$/ },
  CZ: { len: 24, pattern: /^CZ\d{2}\d{20}$/ },
  DE: { len: 22, pattern: /^DE\d{2}\d{18}$/ },
  DK: { len: 18, pattern: /^DK\d{2}\d{14}$/ },
  DO: { len: 28, pattern: /^DO\d{2}[A-Z0-9]{4}\d{20}$/ },
  EE: { len: 20, pattern: /^EE\d{2}\d{16}$/ },
  EG: { len: 29, pattern: /^EG\d{2}\d{25}$/ },
  ES: { len: 24, pattern: /^ES\d{2}\d{22}$/ },
  FI: { len: 18, pattern: /^FI\d{2}\d{14}$/ },
  FK: { len: 18, pattern: /^FK\d{2}[A-Z]{2}\d{12}$/ },
  FO: { len: 18, pattern: /^FO\d{2}\d{14}$/ },
  FR: { len: 27, pattern: /^FR\d{2}\d{10}[A-Z0-9]{11}\d{2}$/ },
  GB: { len: 22, pattern: /^GB\d{2}[A-Z]{4}\d{14}$/ },
  GE: { len: 22, pattern: /^GE\d{2}[A-Z]{2}\d{16}$/ },
  GI: { len: 23, pattern: /^GI\d{2}[A-Z]{4}[A-Z0-9]{15}$/ },
  GL: { len: 18, pattern: /^GL\d{2}\d{14}$/ },
  GR: { len: 27, pattern: /^GR\d{2}\d{7}[A-Z0-9]{16}$/ },
  HR: { len: 21, pattern: /^HR\d{2}\d{17}$/ },
  HU: { len: 28, pattern: /^HU\d{2}\d{24}$/ },
  IE: { len: 22, pattern: /^IE\d{2}[A-Z]{4}\d{14}$/ },
  IL: { len: 23, pattern: /^IL\d{2}\d{19}$/ },
  IQ: { len: 23, pattern: /^IQ\d{2}[A-Z]{4}\d{15}$/ },
  IS: { len: 26, pattern: /^IS\d{2}\d{22}$/ },
  IT: { len: 27, pattern: /^IT\d{2}[A-Z]\d{10}[A-Z0-9]{12}$/ },
  JO: { len: 30, pattern: /^JO\d{2}[A-Z]{4}\d{4}[A-Z0-9]{18}$/ },
  KW: { len: 30, pattern: /^KW\d{2}[A-Z]{4}[A-Z0-9]{22}$/ },
  KZ: { len: 20, pattern: /^KZ\d{2}\d{3}[A-Z0-9]{13}$/ },
  LB: { len: 28, pattern: /^LB\d{2}\d{4}[A-Z0-9]{20}$/ },
  LC: { len: 32, pattern: /^LC\d{2}[A-Z]{4}[A-Z0-9]{24}$/ },
  LI: { len: 21, pattern: /^LI\d{2}\d{12}[A-Z0-9]{1}$/ },
  LT: { len: 20, pattern: /^LT\d{2}\d{16}$/ },
  LU: { len: 20, pattern: /^LU\d{2}\d{3}[A-Z0-9]{13}$/ },
  LV: { len: 21, pattern: /^LV\d{2}[A-Z]{4}[A-Z0-9]{13}$/ },
  LY: { len: 25, pattern: /^LY\d{2}\d{21}$/ },
  MC: { len: 27, pattern: /^MC\d{2}\d{10}[A-Z0-9]{11}\d{2}$/ },
  MD: { len: 24, pattern: /^MD\d{2}[A-Z0-9]{2}[A-Z0-9]{18}$/ },
  ME: { len: 22, pattern: /^ME\d{2}\d{18}$/ },
  MK: { len: 19, pattern: /^MK\d{2}\d{3}[A-Z0-9]{10}\d{2}$/ },
  MN: { len: 24, pattern: /^MN\d{2}\d{20}$/ },
  MR: { len: 27, pattern: /^MR\d{2}\d{23}$/ },
  MT: { len: 31, pattern: /^MT\d{2}[A-Z]{4}\d{5}[A-Z0-9]{18}$/ },
  MU: { len: 30, pattern: /^MU\d{2}[A-Z]{4}\d{19}[A-Z]{3}$/ },
  NL: { len: 18, pattern: /^NL\d{2}[A-Z]{4}\d{10}$/ },
  NO: { len: 15, pattern: /^NO\d{2}\d{11}$/ },
  OM: { len: 23, pattern: /^OM\d{2}\d{3}[A-Z0-9]{16}$/ },
  PK: { len: 24, pattern: /^PK\d{2}[A-Z]{4}[A-Z0-9]{16}$/ },
  PL: { len: 28, pattern: /^PL\d{2}\d{24}$/ },
  PS: { len: 29, pattern: /^PS\d{2}[A-Z]{4}[A-Z0-9]{21}$/ },
  PT: { len: 25, pattern: /^PT\d{2}\d{21}$/ },
  QA: { len: 29, pattern: /^QA\d{2}[A-Z]{4}[A-Z0-9]{21}$/ },
  RO: { len: 24, pattern: /^RO\d{2}[A-Z]{4}[A-Z0-9]{16}$/ },
  RS: { len: 22, pattern: /^RS\d{2}\d{18}$/ },
  RU: { len: 33, pattern: /^RU\d{2}\d{14}[A-Z0-9]{15}$/ },
  SA: { len: 24, pattern: /^SA\d{2}\d{2}[A-Z0-9]{18}$/ },
  SC: { len: 31, pattern: /^SC\d{2}[A-Z]{4}\d{20}[A-Z]{3}$/ },
  SD: { len: 18, pattern: /^SD\d{2}\d{14}$/ },
  SE: { len: 24, pattern: /^SE\d{2}\d{20}$/ },
  SI: { len: 19, pattern: /^SI\d{2}\d{15}$/ },
  SK: { len: 24, pattern: /^SK\d{2}\d{20}$/ },
  SM: { len: 27, pattern: /^SM\d{2}[A-Z]\d{10}[A-Z0-9]{12}$/ },
  ST: { len: 25, pattern: /^ST\d{2}\d{21}$/ },
  SV: { len: 28, pattern: /^SV\d{2}[A-Z]{4}\d{20}$/ },
  TL: { len: 23, pattern: /^TL\d{2}\d{19}$/ },
  TN: { len: 24, pattern: /^TN\d{2}\d{20}$/ },
  TR: { len: 26, pattern: /^TR\d{2}\d{5}[A-Z0-9]{17}$/ },
  UA: { len: 29, pattern: /^UA\d{2}\d{25}$/ },
  VA: { len: 22, pattern: /^VA\d{2}\d{18}$/ },
  VG: { len: 24, pattern: /^VG\d{2}[A-Z]{4}\d{16}$/ },
  XK: { len: 20, pattern: /^XK\d{2}\d{16}$/ },
};

function mod97(iban) {
  // Move first 4 chars to end, convert letters to numbers, compute mod 97
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let rem = 0;
  for (const ch of rearranged) {
    let n;
    if (ch >= '0' && ch <= '9') n = ch.charCodeAt(0) - 48;
    else if (ch >= 'A' && ch <= 'Z') n = ch.charCodeAt(0) - 55; // A=10
    else return -1;
    rem = (rem * (n < 10 ? 10 : 100) + n) % 97;
  }
  return rem;
}

function validateIban(raw) {
  const iban = raw.replace(/\s+/g, '').toUpperCase();
  const result = { input: raw, formatted: iban, country: iban.slice(0, 2), valid: false };
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(iban)) {
    result.reason = 'invalid characters or structure';
    return result;
  }
  const rule = COUNTRY_RULES[result.country];
  if (!rule) { result.reason = 'unknown country code ' + result.country; return result; }
  if (rule.len === 0) { result.reason = result.country + ' does not use IBANs'; return result; }
  result.expectedLength = rule.len;
  if (iban.length !== rule.len) { result.reason = 'length ' + iban.length + ' != expected ' + rule.len; return result; }
  if (rule.pattern && !rule.pattern.test(iban)) { result.reason = 'country-specific BBAN structure mismatch'; return result; }
  if (mod97(iban) !== 1) { result.reason = 'checksum failed (mod-97 != 1)'; return result; }
  result.valid = true;
  // pretty print in groups of 4
  result.pretty = iban.replace(/(.{4})/g, '$1 ').trim();
  result.bankCode = rule.pattern && iban.length > 8 ? iban.slice(4, 8) : undefined;
  return result;
}

function routeIban(u, res, json) {
  const iban = u.searchParams.get('iban') || u.searchParams.get('i');
  if (!iban) return json(res, 400, { error: 'missing ?iban=' });
  return json(res, 200, validateIban(iban));
}
module.exports = { routeIban, validateIban };
