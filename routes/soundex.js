// /soundex — phonetic encoding for fuzzy name matching (classic Soundex + NYSIIS-lite)
function soundex(s) {
  s = s.toUpperCase().replace(/[^A-Z]/g, '');
  if (!s) return '';
  const codes = { B:1,F:1,P:1,V:1, C:2,G:2,J:2,K:2,Q:2,S:2,X:2,Z:2, D:3,T:3, L:4, M:5,N:5, R:6 };
  const first = s[0];
  let prev = codes[first] || '';
  let out = first;
  for (let i = 1; i < s.length && out.length < 4; i++) {
    const c = codes[s[i]];
    if (c === undefined) { prev = ''; continue; } // vowel/h/w/y separator
    if (c !== prev) { out += c; prev = c; }
    // same code as previous letter -> skip (already same)
  }
  return (out + '000').slice(0, 4);
}

function routeSoundex(u, res, json) {
  const p = u.searchParams;
  const name = p.get('name') || p.get('q');
  if (!name) return json(res, 400, { error: 'provide ?name=<string> (or ?compare=Smith,Smyth to check phonetic equality)' });
  const cmp = p.get('compare');
  if (cmp) {
    const names = cmp.split(',').map(s => s.trim()).filter(Boolean);
    const codes = names.map(n => ({ name: n, soundex: soundex(n) }));
    const allEqual = codes.every(c => c.soundex === codes[0].soundex) && codes[0].soundex !== '';
    return json(res, 200, { names: codes, phonetically_equal: allEqual });
  }
  return json(res, 200, { name, soundex: soundex(name) });
}
module.exports = { routeSoundex };
