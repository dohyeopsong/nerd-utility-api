// Semantic version parsing, comparison, and sorting per semver.org spec
const SEMVER_RE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
function parse(v) {
  const m = String(v).trim().match(SEMVER_RE);
  if (!m) throw new Error('invalid semver: ' + v);
  return { major:+m[1], minor:+m[2], patch:+m[3], prerelease: m[4] ? m[4].split('.') : [], build: m[5] || '' };
}
function cmpIdentifiers(a, b) {
  const na = /^[0-9]+$/.test(a), nb = /^[0-9]+$/.test(b);
  if (na && nb) return (+a === +b) ? 0 : (+a < +b ? -1 : 1);
  if (na) return -1; if (nb) return 1;
  return a === b ? 0 : (a < b ? -1 : 1);
}
function compare(a, b) {
  const A = parse(a), B = parse(b);
  for (const k of ['major','minor','patch']) {
    if (A[k] !== B[k]) return A[k] < B[k] ? -1 : 1;
  }
  if (A.prerelease.length === 0 && B.prerelease.length === 0) return 0;
  if (A.prerelease.length === 0) return 1;
  if (B.prerelease.length === 0) return -1;
  for (let i = 0; i < Math.max(A.prerelease.length, B.prerelease.length); i++) {
    const x = A.prerelease[i], y = B.prerelease[i];
    if (x === undefined) return -1; if (y === undefined) return 1;
    const c = cmpIdentifiers(x, y); if (c !== 0) return c;
  }
  return 0;
}
function sortVersions(list) { return [...list].sort(compare); }
function routeSemver(u, res, json) {
  const q = Object.fromEntries(new URL(u, 'http://x').searchParams);
  try {
    if (q.sort) {
      const list = q.sort.split(',').map(s => s.trim()).filter(Boolean);
      list.forEach(v => parse(v)); // validate
      const sorted = sortVersions(list);
      return json(res, 200, { input: list, sorted, greatest: sorted[sorted.length-1], lowest: sorted[0] });
    }
    if (q.a && q.b) {
      const c = compare(q.a, q.b);
      return json(res, 200, { a: q.a, b: q.b, comparison: c === 0 ? 'equal' : c < 0 ? 'a < b' : 'a > b',
        satisfies: {}, latest: c >= 0 ? q.a : q.b });
    }
    if (q.v) {
      const p = parse(q.v);
      return json(res, 200, { version: q.v, major: p.major, minor: p.minor, patch: p.patch,
        prerelease: p.prerelease.join('.') || null, build: p.build || null, valid: true });
    }
    return json(res, 400, { error: 'provide ?v=1.2.3, ?a=1.0.0&b=2.0.0, or ?sort=1.0.0,2.0.0,1.5.0' });
  } catch (e) { return json(res, 400, { error: e.message }); }
}
module.exports = { routeSemver, parse, compare, sortVersions };
