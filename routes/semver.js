// /semver — semantic version compare, diff, and range satisfaction
function parse(v) {
  const m = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(v.trim());
  if (!m) return null;
  return { major: +m[1], minor: +m[2], patch: +m[3], pre: m[4] ? m[4].split('.') : [] };
}
function cmpPrerelease(a, b) {
  // shorter pre < longer when equal prefix; numeric < alphanumeric
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i], y = b[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const xn = /^\d+$/.test(x), yn = /^\d+$/.test(y);
    if (xn && yn) { if (+x !== +y) return +x < +y ? -1 : 1; }
    else if (xn !== yn) return xn ? -1 : 1;
    else if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}
function compare(a, b) {
  const A = parse(a), B = parse(b);
  if (!A || !B) return null;
  for (const k of ['major', 'minor', 'patch']) {
    if (A[k] !== B[k]) return A[k] < B[k] ? -1 : 1;
  }
  if (!A.pre.length && !B.pre.length) return 0;
  if (!A.pre.length) return 1;   // release > prerelease
  if (!B.pre.length) return -1;
  return cmpPrerelease(A.pre, B.pre);
}
function satisfies(v, range) {
  // supports: exact, ^, ~, >=, <=, >, <, =, comma-separated AND
  const parts = range.split(',').map(s => s.trim()).filter(Boolean);
  for (const part of parts) {
    const m = /^(\^|~|>=|<=|>|<|=)?v?(.+)$/.exec(part);
    if (!m) return false;
    const op = m[1] || '=';
    let r = m[2].replace(/\+.*$/, '');
    if (r.split('.').length < 3) { // normalize partial 1.2 -> 1.2.0
      r = r.split('.').concat(['0', '0']).slice(0, 3).join('.');
    }
    const c = compare(v, r);
    if (c === null) return false;
    let ok;
    switch (op) {
      case '=': ok = c === 0; break;
      case '>=': ok = c >= 0; break;
      case '<=': ok = c <= 0; break;
      case '>': ok = c > 0; break;
      case '<': ok = c < 0; break;
      case '^': {
        const R = parse(r); const V = parse(v);
        ok = c >= 0 && V.major === R.major &&
             (R.major > 0 || V.minor === R.minor || V.pre.length); // 0.x: minor must match
        break;
      }
      case '~': {
        const R = parse(r); const V = parse(v);
        ok = c >= 0 && V.major === R.major && V.minor === R.minor;
        break;
      }
    }
    if (!ok) return false;
  }
  return true;
}

function routeSemver(u, res, json) {
  const p = u.searchParams;
  const a = p.get('a');
  const range = p.get('range');
  if (a) {
    const A = parse(a);
    if (!A) return json(res, 400, { error: 'invalid semver: ' + a });
    const b = p.get('b');
    if (!b) return json(res, 200, { version: a, parsed: A });
    const B = parse(b);
    if (!B) return json(res, 400, { error: 'invalid semver: ' + b });
    const c = compare(a, b);
    const rel = c < 0 ? 'a<b' : c > 0 ? 'a>b' : 'equal';
    let diff = 'none';
    if (c !== 0) diff = A.major !== B.major ? 'major' : A.minor !== B.minor ? 'minor' : 'patch';
    return json(res, 200, { comparison: rel, diff });
  }
  if (range) {
    const versions = (p.get('versions') || '').split(',').map(s => s.trim()).filter(Boolean);
    const v = p.get('v');
    if (v) return json(res, 200, { version: v, range, satisfies: satisfies(v, range) });
    if (versions.length) {
      const matching = versions.filter(x => parse(x) && satisfies(x, range));
      return json(res, 200, { range, matching, latest: matching.length ? matching[matching.length - 1] : null });
    }
    return json(res, 400, { error: 'provide ?v=1.2.3 or ?versions=a,b,c' });
  }
  return json(res, 400, { error: 'provide ?a=1.2.3&b=1.3.0 or ?v=1.2.3&range=^1.0.0' });
}

module.exports = { routeSemver, compare, satisfies };
