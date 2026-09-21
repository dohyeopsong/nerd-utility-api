// Semantic versioning: parse, compare, sort (semver.org spec)
const RE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
function parse(v) {
  if (typeof v !== 'string') return null;
  const m = v.trim().match(RE);
  if (!m) return null;
  return { raw: v.trim(), major: +m[1], minor: +m[2], patch: +m[3], prerelease: m[4] ? m[4].split('.') : [], build: m[5] || null };
}
function cmpIdent(a, b) {
  const na = /^\d+$/.test(a), nb = /^\d+$/.test(b);
  if (na && nb) return (+a) - (+b) === 0 ? 0 : (+a < +b ? -1 : 1);
  if (na) return -1; if (nb) return 1;
  return a === b ? 0 : (a < b ? -1 : 1); // ASCII order
}
function compare(a, b) {
  const A = parse(a), B = parse(b);
  if (!A || !B) return null;
  for (const k of ['major','minor','patch']) {
    if (A[k] !== B[k]) return A[k] < B[k] ? -1 : 1;
  }
  // prerelease precedence: absent > present
  if (!A.prerelease.length && B.prerelease.length) return 1;
  if (A.prerelease.length && !B.prerelease.length) return -1;
  if (A.prerelease.length && B.prerelease.length) {
    const n = Math.max(A.prerelease.length, B.prerelease.length);
    for (let i = 0; i < n; i++) {
      const x = A.prerelease[i], y = B.prerelease[i];
      if (x === undefined) return -1; // fewer fields = lower
      if (y === undefined) return 1;
      const c = cmpIdent(x, y);
      if (c) return c;
    }
  }
  return 0;
}
function routeSemver(u, res, json) {
  const q = Object.fromEntries(new URL(u, 'http://x').searchParams);
  if (q.compare) {
    const [a, b] = q.compare.split(',').map(s => s.trim());
    const c = compare(a, b);
    if (c === null) return json(res, 400, { error: 'invalid semver in compare param (use ?compare=a,b)' });
    return json(res, 200, { a, b, result: c === 0 ? 'equal' : (c < 0 ? 'a < b' : 'a > b'), comparison: c });
  }
  if (q.sort) {
    const versions = q.sort.split(',').map(s => s.trim()).filter(Boolean);
    const bad = versions.filter(v => !parse(v));
    if (bad.length) return json(res, 400, { error: 'invalid semver(s)', invalid: bad });
    const sorted = versions.slice().sort((x, y) => compare(x, y));
    const gt = versions.slice().sort((x, y) => compare(y, x));
    return json(res, 200, { input: versions, ascending: sorted, descending: gt, highest: sorted[sorted.length - 1], lowest: sorted[0] });
  }
  if (q.parse) {
    const p = parse(q.parse);
    if (!p) return json(res, 400, { error: 'invalid semver' });
    return json(res, 200, p);
  }
  return json(res, 400, { error: 'use ?compare=a,b | ?sort=v1,v2,... | ?parse=version' });
}
module.exports = { routeSemver, parse, compare };
