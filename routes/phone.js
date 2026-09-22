// /phone — phone validation + E.164 formatting (lightweight, common countries)
const COUNTRY_DIAL = { US:'1', CA:'1', GB:'44', DE:'49', FR:'33', ES:'34', IT:'39', NL:'31', AU:'61', JP:'81', CN:'86', IN:'91', BR:'55', MX:'52', RU:'7', KR:'82', SE:'46', NO:'47', DK:'45', FI:'358', PL:'48', CH:'41', AT:'43', BE:'32', IE:'353', PT:'351', NZ:'64', SG:'65', HK:'852', TW:'886', ZA:'27', NG:'234', EG:'20', TR:'90', SA:'966', AE:'971', IL:'972' };
// approximate national number lengths (total digits after country code)
const LENGTHS = { US:[10], CA:[10], GB:[10], DE:[10,11], FR:[9], ES:[9], IT:[9,10], NL:[9], AU:[9], JP:[10,11], CN:[11], IN:[10], BR:[10,11], MX:[10], RU:[10], KR:[9,10], SE:[7,8,9], NO:[8], DK:[8], FI:[9,10], PL:[9], CH:[9], AT:[10,11], BE:[8,9], IE:[9], PT:[9], NZ:[8,9], SG:[8], HK:[8], TW:[9], ZA:[9], NG:[10], EG:[10], TR:[10], SA:[9], AE:[9], IL:[8,9] };

function routePhone(u, res, json) {
  const q = u.searchParams;
  const raw = q.get('phone');
  if (!raw) return json(res, 400, { error: 'provide ?phone=', example: '/phone?phone=+1 (555) 123-4567' });
  const cc = (q.get('country') || '').toUpperCase();

  // extract digits
  const hasPlus = raw.trim().startsWith('+');
  let digits = raw.replace(/\D/g, '');
  if (!digits) return json(res, 400, { error: 'no digits found' });

  let result = { input: raw };

  if (hasPlus) {
    // E.164 already: match against dial codes
    let matched = null;
    for (const [c, dial] of Object.entries(COUNTRY_DIAL)) {
      if (digits.startsWith(dial) && !matched) {
        // crude: take first plausible match; prefer longer dial code
        if (!matched || dial.length > matched.dial.length) {
          // but avoid matching US '1' when user gave country=GB etc.
          if (!cc || c === cc || COUNTRY_DIAL[cc] === dial) {
            matched = { country: c, dial };
          }
        }
      }
    }
    if (!matched) return json(res, 200, { input: raw, valid: false, reason: 'unknown country code or malformed E.164' });
    result.country = matched.country;
    result.country_code = '+' + matched.dial;
    result.national_number = digits.slice(matched.dial.length);
  } else {
    // national format
    if (!cc) {
      if (digits.length === 10 && digits[0] !== '0') { result.country = 'US'; result.country_code = '+1'; result.national_number = digits; }
      else return json(res, 200, { input: raw, valid: false, reason: 'provide country=XX or +countrycode format' });
    } else if (COUNTRY_DIAL[cc]) {
      // strip leading zero (trunk prefix)
      result.country = cc;
      result.country_code = '+' + COUNTRY_DIAL[cc];
      result.national_number = digits.replace(/^0+/, '');
    } else {
      return json(res, 200, { input: raw, valid: false, reason: `unknown country code ${cc}` });
    }
  }

  const allowed = LENGTHS[result.country] || [7, 8, 9, 10, 11];
  result.valid = allowed.includes(result.national_number.length);
  if (!result.valid) result.reason = `national number should be ${allowed.join(' or ')} digits for ${result.country}, got ${result.national_number.length}`;

  if (result.valid) {
    result.e164 = result.country_code + result.national_number;
    result.national_fmt = formatNational(result.national_number, result.country);
  }
  return json(res, 200, result);
}

function formatNational(n, country) {
  if (country === 'US' || country === 'CA') return `(${n.slice(0,3)}) ${n.slice(3,6)}-${n.slice(6)}`;
  if (n.length === 10) return `${n.slice(0,3)} ${n.slice(3,6)} ${n.slice(6)}`;
  if (n.length === 9) return `${n.slice(0,2)} ${n.slice(2,5)} ${n.slice(5,7)} ${n.slice(7)}`;
  return n.replace(/(.{3})/g, '$1 ').trim();
}

module.exports = { routePhone };
