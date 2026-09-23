// /semver — parse, validate, compare semantic versions (semver.org)
const RE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

function parseSemver(v) {
  const m = RE.exec(v.trim());
  if (!m) return { error: 'invalid semver (expected MAJOR.MINOR.PATCH[-prerelease][+build])' };
  return {
    major: +m[1], minor: +m[2], patch: +m[3],
    prerelease: m[4] || null, build: m[5] || null,
    version: v.trim()
  };
}

function cmpPrerelease(a, b) {
  if (!a && !b) return 0;
  if (!a) return 1;  // no prerelease > prerelease
  if (!b) return -1;
  const as = a.split('.'), bs = b.split('.');
  for (let i = 0; i < Math.max(as.length, bs.length); i++) {
    const x = as[i], y = bs[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const xn = /^\d+$/.test(x), yn = /^\d+$/.test(y);
    if (xn && yn) { if (+x !== +y) return +x < +y ? -1 : 1; }
    else if (xn) return -1;
    else if (yn) return 1;
    else { if (x !== y) return x < y ? -1 : 1; }
  }
  return 0;
}

function compareSemver(a, b) {
  const A = parseSemver(a), B = parseSemver(b);
  if (A.error) return A;
  if (B.error) return B;
  for (const k of ['major', 'minor', 'patch']) {
    if (A[k] !== B[k]) return A[k] < B[k] ? -1 : 1;
  }
  return cmpPrerelease(A.prerelease, B.prerelease);
}

function routeSemver(u, res, json) {
  const p = u.searchParams;
  const v = p.get('v') || p.get('version');
  const a = p.get('a'), b = p.get('b');
  if (a && b) {
    const c = compareSemver(a, b);
    if (typeof c === 'object') return json(res, 400, c);
    return json(res, 200, { a, b, comparison: c === 0 ? 'equal' : c < 0 ? 'a < b' : 'a > b', result: c });
  }
  if (v) {
    const r = parseSemver(v);
    if (r.error) return json(res, 400, r);
    return json(res, 200, { valid: true, ...r });
  }
  return json(res, 400, { error: 'provide ?v=1.2.3 to parse, or ?a=1.2.3&b=1.10.0 to compare' });
}

module.exports = { routeSemver, parseSemver, compareSemver };
