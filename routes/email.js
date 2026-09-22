// /email — email syntax validation + optional MX lookup (via dns.resolveMx)
const dns = require('dns').promises;

const EMAIL_RE = /^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

function routeEmail(u, res, json) {
  const q = u.searchParams;
  const raw = q.get('email');
  if (!raw) return json(res, 400, { error: 'provide ?email=', example: '/email?email=user@example.com' });
  const email = raw.trim().toLowerCase();

  const result = { email, syntax_valid: EMAIL_RE.test(email) };
  if (!result.syntax_valid) {
    result.valid = false;
    result.reason = 'syntax invalid';
    return json(res, 200, result);
  }
  result.local_part = email.slice(0, email.indexOf('@'));
  result.domain = email.slice(email.indexOf('@') + 1);
  result.has_plus_tag = result.local_part.includes('+');
  if (result.has_plus_tag) {
    const [base, tag] = result.local_part.split('+', 2);
    result.base_local_part = base;
    result.plus_tag = tag;
  }

  if (q.get('check_mx') !== 'true') {
    result.valid = true; // syntax only
    result.note = 'pass check_mx=true for MX verification';
    return json(res, 200, result);
  }

  // async MX check
  dns.resolveMx(result.domain)
    .then(mx => {
      result.mx = mx.sort((a, b) => a.priority - b.priority).map(r => r.exchange);
      result.has_mx = result.mx.length > 0;
      result.valid = result.has_mx;
      if (!result.has_mx) result.reason = 'domain has no MX records';
      json(res, 200, result);
    })
    .catch(err => {
      result.has_mx = false;
      result.valid = false;
      result.reason = `MX lookup failed: ${err.code || err.message}`;
      json(res, 200, result);
    });
}

module.exports = { routeEmail };
