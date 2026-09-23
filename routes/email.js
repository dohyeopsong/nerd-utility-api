// /email — email validation: RFC-lite syntax, normalization, disposable-domain and role-account hints
const DISPOSABLE = new Set(['mailinator.com','10minutemail.com','guerrillamail.com','yopmail.com','tempmail.com','temp-mail.org','throwawaymail.com','trashmail.com','sharklasers.com','getnada.com','dispostable.com','maildrop.cc','mailnesia.com','fakeinbox.com','mytemp.email','mohmal.com','emailondeck.com','spam4.me','grr.la','tempr.email','discard.email']);
const ROLE = new Set(['admin','administrator','info','support','sales','billing','help','contact','hello','webmaster','postmaster','hostmaster','abuse','noreply','no-reply','donotreply','orders','team','office','enquiries','enquiry']);
function routeEmail(u, res, json) {
  const p = u.searchParams;
  const email = (p.get('email') || '').trim().toLowerCase();
  if (!email) return json(res, 200, { usage: '?email=user@example.com — validate syntax, detect disposable domains and role accounts, normalize Gmail-style addresses' });
  const out = { email };
  const m = email.match(/^([^@\s]+)@([^@\s]+)$/);
  if (!m) return json(res, 400, { ...out, valid: false, error: 'syntax: expected local@domain' });
  const [_, local, domain] = m;
  if (local.length === 0 || local.length > 64) return json(res, 400, { ...out, valid: false, error: 'local part length 1-64' });
  if (!/^[a-z0-9!#$%&'*+/=?^_`{|}~.-]+$/.test(local)) return json(res, 400, { ...out, valid: false, error: 'invalid characters in local part' });
  if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) return json(res, 400, { ...out, valid: false, error: 'invalid dot placement in local part' });
  if (domain.length > 253) return json(res, 400, { ...out, valid: false, error: 'domain too long' });
  const dparts = domain.split('.');
  if (dparts.some(d => d.length === 0 || d.length > 63)) return json(res, 400, { ...out, valid: false, error: 'invalid domain labels' });
  if (!/^[a-z0-9-]+$/.test(dparts.join(''))) return json(res, 400, { ...out, valid: false, error: 'invalid characters in domain' });
  out.valid = true;
  out.local = local; out.domain = domain;
  out.tld = dparts[dparts.length - 1];
  // hints
  if (DISPOSABLE.has(domain)) out.disposable = true;
  const base = local.split('+')[0];
  if (base !== local) { out.plus_addressed = true; out.normalized = base + '@' + domain; }
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    const g = base.replace(/\./g, '') + '@gmail.com';
    if (g !== email) out.normalized = g;
  }
  if (ROLE.has(base)) out.role_account = true;
  if (domain === 'example.com' || domain.endsWith('.example') || domain.endsWith('.test') || domain.endsWith('.localhost') || domain.endsWith('.invalid')) out.reserved = true;
  if (out.tld.length < 2) { out.valid = false; out.error = 'tld too short'; }
  return json(res, 200, out);
}
module.exports = { routeEmail };
