// /ulid — generate and parse ULIDs (sortable, 128-bit identifiers)
const ENC = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford base32

function encodeTime(ms, len) {
  let out = '';
  for (let i = 1; i <= len; i++) { out = ENC[ms % 32] + out; ms = Math.floor(ms / 32); }
  return out;
}

function randLen(n) {
  const b = require('crypto').randomBytes(n);
  let out = '';
  for (let i = 0; i < n; i++) out += ENC[b[i] % 32];
  return out;
}

function routeUlid(u, res, json) {
  const p = u.searchParams;

  if (p.get('parse')) {
    const s = p.get('parse').toUpperCase();
    if (!/^[0-9A-HJKMNP-TV-Z]{26}$/.test(s)) return json(res, 400, { error: 'invalid ULID' });
    let ms = 0;
    for (const c of s.slice(0, 10)) ms = ms * 32 + ENC.indexOf(c);
    return json(res, 200, { ulid: s, timestamp: ms, iso: new Date(ms).toISOString() });
  }

  const count = Math.min(parseInt(p.get('count') || '1', 10) || 1, 100);
  const ts = p.get('time') ? Date.parse(p.get('time')) : Date.now();
  if (isNaN(ts)) return json(res, 400, { error: 'invalid time param' });
  const ulids = [];
  for (let i = 0; i < count; i++) ulids.push(encodeTime(ts, 10) + randLen(16));
  return json(res, 200, { time: new Date(ts).toISOString(), count, ulids: count === 1 ? ulids[0] : ulids });
}

module.exports = { routeUlid };
