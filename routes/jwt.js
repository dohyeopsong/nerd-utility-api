// /jwt — decode JWT payload/header; optionally verify HS256 signature with ?secret=
const crypto = require('crypto');
function b64url(s) { return Buffer.from(s).toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_'); }
function b64urlParse(s) { s = s.replace(/-/g,'+').replace(/_/g,'/'); while (s.length % 4) s += '='; return Buffer.from(s, 'base64'); }
function routeJwt(u, res, json) {
  const p = u.searchParams;
  const token = p.get('token'), secret = p.get('secret');
  if (!token) return json(res, 200, { usage: '?token=<jwt>&secret=<hs256 secret> — decodes header/payload; with secret also verifies signature and expiry' });
  const parts = token.trim().split('.');
  if (parts.length !== 3) return json(res, 400, { error: 'JWT must have 3 dot-separated segments' });
  let header, payload;
  try { header = JSON.parse(b64urlParse(parts[0]).toString('utf8')); payload = JSON.parse(b64urlParse(parts[1]).toString('utf8')); }
  catch (e) { return json(res, 400, { error: 'segments are not valid base64url JSON: ' + e.message }); }
  const out = { header, payload };
  const alg = header.alg || 'none';
  if (secret) {
    if (alg !== 'HS256' && alg !== 'HS384' && alg !== 'HS512') {
      out.signature_verified = null; out.note = `cannot verify alg ${alg} with a shared secret`;
    } else {
      const expected = crypto.createHmac('sha' + alg.slice(2), secret).update(parts[0] + '.' + parts[1]).digest('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
      out.signature_verified = expected === parts[2];
    }
  }
  if (payload.exp) {
    const now = Math.floor(Date.now() / 1000);
    out.expired = now > payload.exp;
    out.expires_at = new Date(payload.exp * 1000).toISOString();
  }
  return json(res, 200, out);
}
module.exports = { routeJwt };
