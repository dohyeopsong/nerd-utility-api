// /gstin — Indian GST Identification Number validation (15 chars, mod-36 checksum)
const STATES = {
  '01':'Jammu & Kashmir','02':'Himachal Pradesh','03':'Punjab','04':'Chandigarh','05':'Uttarakhand',
  '06':'Haryana','07':'Delhi','08':'Rajasthan','09':'Uttar Pradesh','10':'Bihar','11':'Sikkim',
  '12':'Arunachal Pradesh','13':'Nagaland','14':'Manipur','15':'Mizoram','16':'Tripura','17':'Meghalaya',
  '18':'Assam','19':'West Bengal','20':'Jharkhand','21':'Odisha','22':'Chhattisgarh','23':'Madhya Pradesh',
  '24':'Gujarat','25':'Daman & Diu','26':'Dadra & Nagar Haveli and Daman & Diu','27':'Maharashtra',
  '29':'Karnataka','30':'Goa','31':'Lakshadweep','32':'Kerala','33':'Tamil Nadu','34':'Puducherry',
  '35':'Andaman & Nicobar','36':'Telangana','37':'Andhra Pradesh','38':'Ladakh','97':'Other Territory'
};
const CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
function checksumDigit(s14) { // mod-36 checksum: factors 1,2 alternate from LEFT starting at 1
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const v = CHARS.indexOf(s14[i]);
    const prod = v * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(prod / 36) + (prod % 36);
  }
  return CHARS[(36 - (sum % 36)) % 36];
}
function routeGstin(u, res, json) {
  const p = u.searchParams.get('gstin');
  if (!p) return json(res, 200, { usage: '?gstin=29ABCDE1234F1Z5 (validate 15-char Indian GSTIN)' });
  const g = String(p).trim().toUpperCase();
  const out = { input: p, valid: false };
  if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]{3}$/.test(g)) {
    return json(res, 422, { error: 'invalid GSTIN format (expected 2-digit state + 5-letter PAN-like + 3-char + check digit)', ...out });
  }
  const expected = checksumDigit(g.slice(0, 14));
  out.state_code = g.slice(0, 2);
  out.state = STATES[out.state_code] || 'unknown state code';
  out.pan_part = g.slice(2, 12);
  out.entity_code = g[12];
  out.default_flag = g[13] === 'Z' ? 'regular' : 'other/default (' + g[13] + ')';
  out.check_digit = g[14];
  out.check_digit_expected = expected;
  out.checksum_valid = g[14] === expected;
  out.valid = out.checksum_valid;
  if (!out.checksum_valid) return json(res, 422, { error: 'checksum mismatch', ...out });
  return json(res, 200, out);
}
module.exports = { routeGstin };
