// /caesar — Caesar cipher encode/decode with shift
function routeCaesar(u, res, json) {
  const p = u.searchParams;
  const text = p.get('text') || p.get('encode');
  const decoded = p.get('decode');
  const shiftRaw = parseInt(p.get('shift') || '3', 10);
  if ((!text && !decoded) || !Number.isFinite(shiftRaw)) {
    return json(res, 200, { usage: '?text=hello&shift=3 (encode) or ?decode=khoor&shift=3 (decode)' });
  }
  let shift = ((shiftRaw % 26) + 26) % 26; // normalize
  if (decoded) shift = (26 - shift) % 26; // decoding = shift backwards

  const input = text || decoded;
  let out = '';
  for (const ch of input) {
    const c = ch.charCodeAt(0);
    if (c >= 65 && c <= 90) out += String.fromCharCode(((c - 65 + shift) % 26) + 65);
    else if (c >= 97 && c <= 122) out += String.fromCharCode(((c - 97 + shift) % 26) + 97);
    else out += ch;
  }
  return json(res, 200, { result: out, shift, mode: decoded ? 'decode' : 'encode', input });
}
module.exports = { routeCaesar };
