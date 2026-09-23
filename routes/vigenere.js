// /vigenere — Vigenère cipher encode/decode
function vig(input, key, decode) {
  const k = key.replace(/[^a-zA-Z]/g, '').toLowerCase();
  if (!k) return null;
  let j = 0, out = '';
  for (const ch of input) {
    const c = ch.charCodeAt(0);
    if (c >= 65 && c <= 90 || c >= 97 && c <= 122) {
      const base = c >= 97 ? 97 : 65;
      const kc = k.charCodeAt(j % k.length) - 97;
      const shift = decode ? (26 - kc) % 26 : kc;
      out += String.fromCharCode(((c - base + shift) % 26) + base);
      j++;
    } else out += ch;
  }
  return out;
}
function routeVigenere(u, res, json) {
  const p = u.searchParams;
  const text = p.get('text') || p.get('encode');
  const decoded = p.get('decode');
  const key = p.get('key');
  if ((!text && !decoded) || !key) return json(res, 200, { usage: '?text=hello&key=LEMON (encode) or ?decode=hello&key=LEMON (decode)' });
  const input = text || decoded;
  const result = vig(input, key, !!decoded);
  if (result === null) return json(res, 400, { error: 'key must contain letters' });
  return json(res, 200, { result, key: key.replace(/[^a-zA-Z]/g, '').toLowerCase(), mode: decoded ? 'decode' : 'encode', input });
}
module.exports = { routeVigenere };
