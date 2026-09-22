// /email — email validation, normalization, gravatar
const crypto = require('crypto');
const DISPOSABLE = new Set(['mailinator.com','guerrillamail.com','10minutemail.com','tempmail.com','throwawaymail.com','yopmail.com','sharklasers.com','getnada.com','dispostable.com','trashmail.com']);

function routeEmail(u, res, json) {
  const q = u.searchParams;
  const email = (q.get('email') || q.get('text') || '').trim();
  if (!email) return json(res, 400, { error: 'provide ?email=user@example.com', example: '/email?email=User@Example.com' });
  try {
    const local = email.slice(0, email.lastIndexOf('@'));
    const domain = email.slice(email.lastIndexOf('@') + 1).toLowerCase();
    const syntaxOk = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/.test(email);
    if (!syntaxOk) throw new Error('invalid email syntax');
    const normalized = local.toLowerCase() + '@' + domain;
    const gmailLike = domain === 'gmail.com' || domain === 'googlemail.com';
    const normLocal = gmailLike ? local.toLowerCase().replace(/\+.*$/, '').replace(/\./g, '') : local.toLowerCase();
    const gravatar = crypto.createHash('md5').update(normalized).digest('hex');
    return json(res, 200, {
      email: normalized,
      local_part: local,
      domain,
      is_gmail: gmailLike,
      gmail_normalized: gmailLike ? normLocal + '@gmail.com' : null,
      is_disposable_domain: DISPOSABLE.has(domain),
      gravatar: 'https://www.gravatar.com/avatar/' + gravatar + '?d=identicon',
      gravatar_hash: gravatar,
      plus_alias: local.includes('+') ? local.split('+')[0] + '@' + domain : null,
    });
  } catch (e) {
    return json(res, 400, { error: e.message, example: '/email?email=user@example.com' });
  }
}
module.exports = { routeEmail };
