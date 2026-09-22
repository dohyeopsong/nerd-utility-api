// /hmac — HMAC generation (any supported digest) and expected-value verification
const crypto = require('crypto');
function routeHmac(u, res, json, reqBodyRaw) {
  const q = u.searchParams;
  let body = {};
  if (typeof reqBodyRaw === 'string' && reqBodyRaw.trim()) {
    try { body = JSON.parse(reqBodyRaw); } catch (e) { body = {}; }
  } else if (reqBodyRaw && typeof reqBodyRaw === 'object') body = reqBodyRaw;
  const text = body.text !== undefined ? body.text : q.get('text');
  const key = body.key !== undefined ? body.key : q.get('key');
  const algo = (body.algo || q.get('algo') || 'sha256').toLowerCase();
  const expected = body.expected !== undefined ? body.expected : q.get('expected');
  if (text === undefined || text === null || text === '') return json(res, 400, { error: 'text required' });
  if (key === undefined || key === null || key === '') return json(res, 400, { error: 'key required' });
  const algos = ['md5', 'sha1', 'sha256', 'sha384', 'sha512'];
  if (algo === 'all') {
    const out = {};
    for (const a of algos) out[a] = crypto.createHmac(a, key).update(text, 'utf8').digest('hex');
    return json(res, 200, { text, algos: out });
  }
  if (!algos.includes(algo)) return json(res, 400, { error: 'algo must be one of ' + algos.join(', ') + ', or all' });
  const hmac = crypto.createHmac(algo, key).update(text, 'utf8').digest('hex');
  const out = { algo, hmac };
  if (expected !== undefined && expected !== null) {
    out.expected = expected;
    out.match = hmac === String(expected).toLowerCase();
  }
  return json(res, 200, out);
}
module.exports = { routeHmac };
