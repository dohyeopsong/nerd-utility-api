// Semantic versioning: parse, compare, sort (semver.org precedence)
function parse(v) {
  const m = String(v).trim().match(/^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/);
  if (!m) throw new Error('invalid semver: ' + v);
  return { major: +m[1], minor: +m[2], patch: +m[3], prerelease: m[4] ? m[4].split('.') : [], build: m[5] };
}
function cmpPrerelease(a, b) {
  if (a.length === 0 && b.length === 0) return 0;
  if (a.length === 0) return 1;   // no prerelease > prerelease
  if (b.length === 0) return -1;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i], y = b[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const xn = /^\d+$/.test(x), yn = /^\d+$/.test(y);
    if (xn && yn) { if (+x !== +y) return +x < +y ? -1 : 1; }
    else if (xn) return -1;      // numeric < alphanumeric
    else if (yn) return 1;
    else if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}
function compare(a, b) {
  const A = parse(a), B = parse(b);
  for (const k of ['major','minor','patch']) {
    if (A[k] !== B[k]) return A[k] < B[k] ? -1 : 1;
  }
  return cmpPrerelease(A.prerelease, B.prerelease);
}
function routeSemver(u, res, json) {
  const q = Object.fromEntries(new URL(u, 'http://x').searchParams);
  const versions = (q.versions || q.number).split(',').map(s => s.trim()).filter(Boolean);
  if (!versions.length) return json(res, 400, { error: 'provide ?versions=1.2.3,1.0.0 or ?a=...&b=...' });
  try {
    if (q.a && q.b) {
      const c = compare(q.a, q.b);
      return json(res, 200, { a: q.a, b: q.b, comparison: c === 0 ? 'equal' : c < 0 ? 'less than' : 'greater than', result: c });
    }
    const sorted = [...versions].sort(compare);
    return json(res, 200, { input: versions, sorted, latest: sorted[sorted.length - 1], oldest: sorted[0] });
  } catch (e) { return json(res, 400, { error: e.message }); }
}
module.exports = { routeSemver, compare, parse };
