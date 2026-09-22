// /iban — validate and decompose International Bank Account Numbers (ISO 13616)
function routeIban(u, res, json) {
  const q = u.searchParams;
  const raw = (q.get('iban') || q.get('v') || '').trim();
  if (!raw) return json(res, 400, { error: 'iban required' });
  const iban = raw.replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(iban)) {
    return json(res, 400, { valid: false, error: 'malformed IBAN (expected CCkk + BBAN)' });
  }
  const cc = iban.slice(0, 2);
  // per-country lengths (common ones; fallback max 34)
  const L = { AL:28, AD:24, AT:20, AZ:28, BH:22, BE:16, BA:20, BR:29, BG:22, HR:21, CY:28, CZ:24,
    DK:18, DO:28, EE:20, FO:18, FI:18, FR:27, GE:22, DE:22, GI:23, GR:27, GL:18, GT:28, HU:28,
    IS:26, IE:22, IL:23, IT:27, JO:30, KZ:20, KW:30, LV:21, LB:28, LI:21, LT:20, LU:20, MK:19,
    MT:31, MR:27, MU:30, MD:24, MC:27, ME:22, NL:18, NO:15, PK:24, PS:29, PL:28, PT:25, QA:29,
    RO:24, SM:27, SA:24, RS:22, SK:24, SI:19, ES:24, SE:24, CH:21, TN:24, TR:26, AE:23, GB:22, VG:24 };
  const expected = L[cc];
  const problems = [];
  if (!expected) problems.push(`unknown country code: ${cc}`);
  else if (iban.length !== expected) problems.push(`length ${iban.length}, expected ${expected} for ${cc}`);
  // mod-97 check (ISO 7064): move first 4 chars to end, letters → 10..35
  let valid = false;
  if (expected && iban.length === expected) {
    const rearr = iban.slice(4) + iban.slice(0, 4);
    const num = rearr.replace(/[A-Z]/g, c => c.charCodeAt(0) - 55);
    let rem = 0;
    for (const d of num) rem = (rem * 10 + +d) % 97;
    valid = rem === 1;
    if (!valid) problems.push('checksum failed (mod-97)');
  }
  const out = {
    iban, valid, country: cc,
    check_digits: iban.slice(2, 4),
    bban: iban.slice(4),
    formatted: iban.replace(/(.{4})/g, '$1 ').trim()
  };
  if (problems.length) out.problems = problems;
  // national structure hints for common formats
  const hints = {
    DE: { bank_code: [4, 12], account: [12, 22] },
    GB: { bank_code: [4, 8], sort_code: [8, 14], account: [14, 22] },
    FR: { bank_code: [4, 9], branch: [9, 14], account: [14, 25] },
    NL: { bank_code: [4, 8], account: [8, 16] }
  };
  if (valid && hints[cc]) {
    const h = hints[cc];
    const parts = {};
    for (const [k, [s, e]] of Object.entries(h)) parts[k] = iban.slice(s, e);
    out.structure = parts;
  }
  return json(res, 200, out);
}
module.exports = { routeIban };
