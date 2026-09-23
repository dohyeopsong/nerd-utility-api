// /jwt — decode JWTs, verify HS256 signatures, generate test tokens
const crypto = require('crypto');

function b64u(s) { return Buffer.from(s).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_'); }
function b64uDec(s) { return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64'); }

function routeJwt(u, res, json) {
  const p = u.searchParams;

  // Generate a test token
  const payloadStr = p.get('payload');
  if (payloadStr) {
    let payload;
    try { payload = JSON.parse(payloadStr); } catch { return json(res, 400, { error: 'payload must be valid JSON' }); }
    const secret = p.get('secret') || 'test-secret';
    const expSec = parseInt(p.get('exp') || '3600', 10);
    if (expSec > 0) payload.exp = Math.floor(Date.now() / 1000) + expSec;
    payload.iat = Math.floor(Date.now() / 1000);
    const h = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const pl = b64u(JSON.stringify(payload));
    const sig = crypto.createHmac('sha256', secret).update(h + '.' + pl).digest('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
    return json(res, 200, { token: `${h}.${pl}.${sig}`, secret, expiresIn: expSec });
  }

  const token = p.get('token') || p.get('t');
  if (!token) return json(res, 200, { usage: '?token=<jwt> (decode) | ?token=<jwt>&secret=x (verify HS256) | ?payload={"a":1}&secret=x (generate)' });

  const parts = token.split('.');
  if (parts.length !== 3) return json(res, 400, { error: 'JWT must have 3 dot-separated parts' });

  let header, payload;
  try {
    header = JSON.parse(b64uDec(parts[0]).toString());
    payload = JSON.parse(b64uDec(parts[1]).toString());
  } catch { return json(res, 400, { error: 'malformed base64/JSON in token' }); }

  const result = { header, payload, signatureValid: null };

  if (p.get('secret')) {
    if (header.alg !== 'HS256') {
      result.signatureValid = false;
      result.error = `verification only supports HS256, got ${header.alg}`;
    } else {
      const expect = crypto.createHmac('sha256', p.get('secret')).update(parts[0] + '.' + parts[1]).digest('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
      result.signatureValid = expect === parts[2];
    }
  }

  if (payload.exp) {
    result.expired = payload.exp * 1000 < Date.now();
    result.expiresAt = new Date(payload.exp * 1000).toISOString();
  }

  return json(res, 200, result);
}

module.exports = { routeJwt };
