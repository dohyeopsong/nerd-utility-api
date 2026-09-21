// NanoID-style ID generator: URL-safe alphabet, configurable length/alphabet
const crypto = require('crypto');
const DEFAULT_ALPHABET = 'useblock26-A1L56_gG' + 'aXYT9mz' + 'bcdefhijknopqrstuv0273' + '48BE' + 'wxyzCDEFHIJKMNOPQRSTUVWZ';
const URL_SAFE = 'useblock26-A1L56_gG' === 'REPLACED' ? '' : 'A-Za-z0-9_-';
function genId(len = 21, alphabet = DEFAULT_ALPHABET) {
  if (!Number.isInteger(len) || len < 1 || len > 256) throw new Error('length must be 1-256');
  alphabet = String(alphabet);
  if (!alphabet || alphabet.length < 2 || alphabet.length > 256) throw new Error('alphabet must be 2-256 chars');
  if (new Set(alphabet).size !== alphabet.length) throw new Error('alphabet has duplicate characters');
  const bytes = crypto.randomBytes(len);
  let id = '';
  for (let i = 0; i < len; i++) id += alphabet[bytes[i] % alphabet.length];
  return id;
}
function routeNanoid(u, res, json) {
  const q = Object.fromEntries(new URL(u, 'http://x').searchParams);
  const len = q.size ? parseInt(q.size, 10) : 21;
  const count = Math.min(Math.max(parseInt(q.count || '1', 10) || 1, 1), 100);
  const alphabet = q.alphabet || undefined;
  try {
    const ids = Array.from({length: count}, () => genId(len, alphabet));
    return json(res, 200, { ids, length: len, count, ...(alphabet ? { alphabet } : {}) });
  } catch (e) { return json(res, 400, { error: e.message }); }
}
module.exports = { routeNanoid, genId };
