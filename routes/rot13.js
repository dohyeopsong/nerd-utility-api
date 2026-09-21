// ROT13 / Caesar shift cipher (encode = decode for rot13)
function caesar(text, shift) {
  const s = ((shift % 26) + 26) % 26;
  return String(text).replace(/[a-zA-Z]/g, c => {
    const base = c <= 'Z' ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + s) % 26) + base);
  });
}
function routeRot13(u, res, json) {
  const q = Object.fromEntries(new URL(u, 'http://x').searchParams);
  const text = q.text || q.number;
  if (!text) return json(res, 400, { error: 'provide ?text=<string>&shift=<n, default 13>' });
  const shift = parseInt(q.shift || '13', 10);
  if (isNaN(shift)) return json(res, 400, { error: 'shift must be an integer' });
  return json(res, 200, { input: text, shift, result: caesar(text, shift) });
}
module.exports = { routeRot13, caesar };
