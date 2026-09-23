// /punycode — RFC 3492 punycode encode/decode + IDN to ASCII/Unicode
const BASE = 36, TMIN = 1, TMAX = 26, SKEW = 38, DAMP = 700, INITIAL_BIAS = 72, INITIAL_N = 128;

function adapt(delta, numpoints, firsttime) {
  delta = firsttime ? Math.floor(delta / DAMP) : delta >> 1;
  delta += Math.floor(delta / numpoints);
  let k = 0;
  while (delta > ((BASE - TMIN) * TMAX) >> 1) { delta = Math.floor(delta / (BASE - TMIN)); k += BASE; }
  return k + Math.floor(((BASE - TMIN + 1) * delta) / (delta + SKEW));
}

function digit(ch) {
  const c = ch.charCodeAt(0);
  if (c >= 97 && c <= 122) return c - 97;
  if (c >= 65 && c <= 90) return c - 65;
  if (c >= 48 && c <= 57) return c - 48 + 26;
  return null;
}
function digitChar(d) { return String.fromCharCode(d < 26 ? 97 + d : 22 + d); }

function encode(input) {
  const cps = [...input].map(c => c.codePointAt(0));
  const output = cps.filter(cp => cp < 0x80);
  const b = output.length;
  let h = b;
  if (b > 0) output.push(0x2d); // '-'
  let n = INITIAL_N, delta = 0, bias = INITIAL_BIAS;
  while (h < cps.length) {
    let m = Infinity;
    for (const cp of cps) if (cp >= n && cp < m) m = cp;
    delta += (m - n) * (h + 1);
    n = m;
    for (const cp of cps) {
      if (cp < n && ++delta === 0) throw new Error('overflow');
      if (cp === n) {
        let q = delta;
        for (let k = BASE; ; k += BASE) {
          const t = k <= bias ? TMIN : k >= bias + TMAX ? TMAX : k - bias;
          if (q < t) break;
          output.push(digitChar(t + ((q - t) % (BASE - t))).charCodeAt(0));
          q = Math.floor((q - t) / (BASE - t));
        }
        output.push(digitChar(q).charCodeAt(0));
        bias = adapt(delta, h + 1, h === b);
        delta = 0;
        h++;
      }
    }
    delta++; n++;
  }
  return String.fromCharCode(...output);
}

function decode(input) {
  const basicEnd = input.lastIndexOf('-');
  const output = [...(basicEnd >= 0 ? input.slice(0, basicEnd) : '')].map(c => c.charCodeAt(0));
  const extended = basicEnd >= 0 ? input.slice(basicEnd + 1) : input;
  let n = INITIAL_N, i = 0, bias = INITIAL_BIAS;
  let idx = 0;
  while (idx < extended.length) {
    const oldi = i;
    let w = 1;
    for (let k = BASE; ; k += BASE) {
      if (idx >= extended.length) throw new Error('invalid input');
      const d = digit(extended[idx++]);
      if (d === null) throw new Error('invalid input');
      i += d * w;
      const t = k <= bias ? TMIN : k >= bias + TMAX ? TMAX : k - bias;
      if (d < t) break;
      w *= BASE - t;
    }
    const outLen = output.length + 1;
    bias = adapt(i - oldi, outLen, oldi === 0);
    n += Math.floor(i / outLen);
    i %= outLen;
    output.splice(i++, 0, n);
  }
  return String.fromCodePoint(...output);
}

function toASCII(domain) {
  return domain.split('.').map(label =>
    /^[\x00-\x7f]*$/.test(label) ? label : 'xn--' + encode(label)).join('.');
}
function toUnicode(domain) {
  return domain.split('.').map(label => {
    if (!label.toLowerCase().startsWith('xn--')) return label;
    try { return decode(label.slice(4)); } catch { return label; }
  }).join('.');
}

function routePunycode(u, res, json) {
  const p = u.searchParams;
  const q = p.get('q');
  if (!q) return json(res, 400, { error: 'provide ?q=text (use ?domain=1 for whole domains)' });
  const mode = p.get('mode') || 'encode';
  try {
    if (p.get('domain') === '1') {
      return json(res, 200, { domain: q, ascii: toASCII(q), unicode: toUnicode(q) });
    }
    if (mode === 'decode') {
      const d = q.toLowerCase().startsWith('xn--') ? q.slice(4) : q;
      return json(res, 200, { decoded: decode(d) });
    }
    return json(res, 200, { encoded: encode(q) });
  } catch (e) { return json(res, 400, { error: e.message }); }
}

module.exports = { routePunycode, encode, decode, toASCII, toUnicode };
