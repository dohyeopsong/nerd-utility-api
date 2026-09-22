// /email — email validation: RFC 5322-ish syntax + common typos + disposable-domain detection
const DISPOSABLE = new Set(['mailinator.com','10minutemail.com','guerrillamail.com','temp-mail.org','yopmail.com','throwawaymail.com','sharklasers.com','getnada.com','dispostable.com','trashmail.com','fakeinbox.com','maildrop.cc','mytemp.email','moakt.com','tempail.com','emailondeck.com','mailnesia.com','spam4.me','grr.la','tempinbox.com','discard.email']);
const FREE = new Set(['gmail.com','yahoo.com','outlook.com','hotmail.com','aol.com','icloud.com','protonmail.com','proton.me','zoho.com','gmx.com','yandex.com','mail.com','live.com','msn.com','fastmail.com','tutanota.com']);
const COMMON_TYPOS = { 'gmial.com':'gmail.com','gmai.com':'gmail.com','gnail.com':'gmail.com','gmail.co':'gmail.com','gmail.cm':'gmail.com','yahoo.co':'yahoo.com','yaho.com':'yahoo.com','hotmial.com':'hotmail.com','hotmail.co':'hotmail.com','outlok.com':'outlook.com','outlook.co':'outlook.com' };

function routeEmail(u, res, json) {
  const q = u.searchParams;
  const check = q.get('check');
  if (!check) return json(res, 400, { error: 'provide ?check=user@domain', example: '/email?check=hello@gmail.com' });

  const s = check.trim().toLowerCase();
  const out = { input: check, email: s };

  // syntax: local@domain, allow quoted local not supported (keep pragmatic)
  const at = s.lastIndexOf('@');
  if (at < 1) { out.valid = false; out.reason = 'missing @'; return json(res, 200, out); }
  const local = s.slice(0, at);
  const domain = s.slice(at + 1);

  if (local.length === 0) { out.valid = false; out.reason = 'empty local part'; return json(res, 200, out); }
  if (local.length > 64) { out.valid = false; out.reason = 'local part > 64 chars'; return json(res, 200, out); }
  if (!/^[a-z0-9!#$%&'*+\\/=?^_`{|}~.-]+$/.test(local)) { out.valid = false; out.reason = 'invalid characters in local part'; return json(res, 200, out); }
  if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) { out.valid = false; out.reason = 'invalid dot placement in local part'; return json(res, 200, out); }

  if (!domain.includes('.') || domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) {
    out.valid = false; out.reason = 'malformed domain'; return json(res, 200, out);
  }
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) { out.valid = false; out.reason = 'invalid domain format'; return json(res, 200, out); }
  if (domain.length > 253) { out.valid = false; out.reason = 'domain > 253 chars'; return json(res, 200, out); }

  out.valid = true;
  out.local = local; out.domain = domain;
  out.is_disposable = DISPOSABLE.has(domain);
  out.is_free_provider = FREE.has(domain);

  const typo = COMMON_TYPOS[domain];
  if (typo) { out.possible_typo = { of: typo, suggestion: `${local}@${typo}` }; }

  return json(res, 200, out);
}

module.exports = { routeEmail };
