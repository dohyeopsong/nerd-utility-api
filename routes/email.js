// /email — RFC 5322-ish email validation with heuristic checks
const DISPOSABLE = ['mailinator.com','guerrillamail.com','10minutemail.com','tempmail.com','throwawaymail.com','yopmail.com','sharklasers.com','getnada.com','dispostable.com','trashmail.com'];
const FREE = ['gmail.com','yahoo.com','outlook.com','hotmail.com','aol.com','icloud.com','protonmail.com','mail.com','zoho.com','gmx.com','yandex.com','live.com'];
const ROLE = ['admin','info','support','sales','contact','help','billing','webmaster','postmaster','noreply','no-reply','hr','jobs','careers'];

function routeEmail(u, res, json) {
  const q = u.searchParams;
  const e = (q.get('check') || '').trim();
  if (!e) return json(res, 400, { error: 'provide ?check=user@example.com', example: '/email?check=user@example.com' });

  const out = { input: e };
  const at = e.lastIndexOf('@');
  if (at < 1 || at === e.length - 1) {
    out.valid = false; out.reason = 'missing or misplaced @';
    return json(res, 200, out);
  }
  const local = e.slice(0, at);
  const domain = e.slice(at + 1);

  out.local = local;
  out.domain = domain;

  // local part: 1-64 chars, allowed atoms with dots not leading/trailing/double
  const localOk = local.length >= 1 && local.length <= 64 &&
    !local.startsWith('.') && !local.endsWith('.') && !local.includes('..') &&
    /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~.-]+$/.test(local);
  // domain: labels, at least one dot, valid chars, no leading/trailing hyphen per label
  const domainOk = domain.length <= 253 && /^[A-Za-z0-9.-]+$/.test(domain) &&
    domain.includes('.') && !domain.startsWith('-') && !domain.endsWith('-') &&
    !domain.startsWith('.') && !domain.endsWith('.') && !domain.includes('..') &&
    domain.split('.').every(l => l.length > 0 && l.length <= 63 && !l.startsWith('-') && !l.endsWith('-')) &&
    !/^\d+\.\d+\.\d+\.\d+$/.test(domain); // IP literal domains are rare/invalid here

  out.valid = localOk && domainOk;
  if (!out.valid) out.reason = !localOk ? 'invalid local part' : 'invalid domain';

  // classify
  out.is_free_provider = FREE.includes(domain.toLowerCase());
  out.is_disposable = DISPOSABLE.includes(domain.toLowerCase());
  const lp = local.toLowerCase();
  out.is_role_address = ROLE.includes(lp);
  out.suggested_correction = null;

  // common typo fixes for gmail
  const gm = ['gmial.com','gmai.com','gmail.co','gmail.con','gmaill.com'];
  if (gm.includes(domain.toLowerCase())) {
    out.suggested_correction = local + '@gmail.com';
    out.typo_detected = true;
  }

  // deliverability risk (heuristic, no MX lookup)
  let risk = 'low';
  if (out.is_disposable) risk = 'high';
  else if (!out.valid) risk = 'invalid';
  else if (out.is_role_address) risk = 'medium';
  out.deliverability_risk = risk;

  return json(res, 200, out);
}

module.exports = { routeEmail };
