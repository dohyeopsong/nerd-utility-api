// /rot13 — ROT-n letter substitution cipher (default 13)
function rotN(s, n) {
  n = ((n % 26) + 26) % 26;
  return s.replace(/[a-zA-Z]/g, c => {
    const base = c <= 'Z' ? 65 : 97;
    return String.fromCharCode((c.charCodeAt(0) - base + n) % 26 + base);
  });
}

function routeRot13(u, res, json) {
  const q = u.searchParams;
  const text = q.get('text') || '';
  const n = parseInt(q.get('n') || '13', 10);

  if (!text) {
    return json(res, 400, {
      error: 'provide ?text=hello',
      note: 'ROT-n substitution cipher (default 13, self-inverse for n=13). ?n= any integer.'
    });
  }
  if (isNaN(n)) return json(res, 400, { error: 'n must be an integer' });

  const encoded = rotN(text, n);
  const out = { input: text, n, result: encoded };
  if (n === 13) out.note = 'ROT13 is self-inverse: applying again restores the original';
  return json(res, 200, out);
}

module.exports = { routeRot13 };
