// HTML entity codec: /htmlesc?encode=<text> — escape to entities
// /htmlesc?decode=&lt;html&gt; — decode entities back
const NAMED = { '&': 'amp', '<': 'lt', '>': 'gt', '"': 'quot', "'": 'apos', '\u00A0': 'nbsp', '\u00A9': 'copy', '\u00AE': 'reg', '\u2122': 'trade', '\u20AC': 'euro', '\u00A3': 'pound', '\u00A5': 'yen', '\u00A2': 'cent', '\u00A7': 'sect', '\u00B6': 'para', '\u00B1': 'plusmn', '\u00D7': 'times', '\u00F7': 'divide', '\u00B0': 'deg', '\u00B5': 'micro', '\u00BD': 'frac12', '\u00BC': 'frac14', '\u00BE': 'frac34', '\u2190': 'larr', '\u2192': 'rarr', '\u2191': 'uarr', '\u2193': 'darr', '\u2194': 'harr', '\u2665': 'hearts', '\u2666': 'diams', '\u2663': 'clubs', '\u2660': 'spades', '\u263A': 'smile', '\u2022': 'bull' };
const REV = Object.fromEntries(Object.entries(NAMED).map(([c, n]) => [n, c]));
async function routeHtmlEsc(u, res, json) {
  const enc = u.searchParams.get('encode');
  const dec = u.searchParams.get('decode');
  if (enc !== null && enc !== undefined) {
    let out = '';
    for (const ch of enc) {
      if (ch in NAMED) out += '&' + NAMED[ch] + ';';
      else if (ch.charCodeAt(0) > 126) out += '&#' + ch.codePointAt(0) + ';';
      else out += ch;
    }
    return json(res, 200, { input: enc, output: out, method: 'named+numeric' });
  }
  if (dec !== null && dec !== undefined) {
    let out = dec
      .replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z][a-zA-Z0-9]*);/g, (m, g) => {
        if (g[0] === '#') {
          if (g[1] === 'x' || g[1] === 'X') return String.fromCodePoint(parseInt(g.slice(2), 16));
          return String.fromCodePoint(parseInt(g.slice(1), 10));
        }
        return g in REV ? REV[g] : m;
      });
    return json(res, 200, { input: dec, output: out });
  }
  return json(res, 400, { error: 'provide ?encode=text or ?decode=&lt;entities&gt;' });
}
module.exports = { routeHtmlEsc };
