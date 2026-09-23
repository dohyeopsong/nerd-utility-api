// /gravatar — Gravatar avatar URLs and hashes from email addresses
const crypto = require('crypto');
function md5(s) { return crypto.createHash('md5').update(s.trim().toLowerCase()).digest('hex'); }
function sha256(s) { return crypto.createHash('sha256').update(s.trim().toLowerCase()).digest('hex'); }
function routeGravatar(u, res, json) {
  const p = u.searchParams;
  const email = p.get('email') || p.get('e');
  if (!email) return json(res, 200, { usage: '?email=someone@example.com [&size=256] [&d=404|mp|identicon|monsterid|wavatar|retro|robohash] [&forceDefault=1] [&rating=g|pg|r|x]' });
  const m = email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  if (!m) return json(res, 400, { error: 'invalid email' });
  const size = Math.min(Math.max(+(p.get('size') || 80) || 80, 1), 2048);
  const d = p.get('d') || 'mp';
  const rating = p.get('rating') || 'g';
  const h = md5(email);
  const h256 = sha256(email);
  const qs = `s=${size}&d=${encodeURIComponent(d)}&r=${rating}` + (p.get('forceDefault') ? '&f=y' : '');
  return json(res, 200, {
    email: email.trim().toLowerCase(),
    md5: h,
    sha256: h256,
    avatar_url: `https://www.gravatar.com/avatar/${h}?${qs}`,
    avatar_url_sha256: `https://www.gravatar.com/avatar/${h256}?${qs}`,
    profile_url: `https://www.gravatar.com/${h}.json`,
    size, default_image: d, rating,
  });
}
module.exports = { routeGravatar };
