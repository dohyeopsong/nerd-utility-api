// Semver utilities: /semver?version=1.2.3 — parse & validate
// /semver?a=1.2.3&b=2.0.0 — compare. /semver?sort=1.0.0,2.1.0,1.9.9 — sort list.
function parseSemver(v) {
  const m = String(v).trim().match(/^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/);
  if (!m) return null;
  return { major: +m[1], minor: +m[2], patch: +m[3], prerelease: m[4] || null, build: m[5] || null };
}
// SemVer precedence comparison (build metadata ignored)
function cmp(a, b) {
  if (a.major !== b.major) return Math.sign(a.major - b.major);
  if (a.minor !== b.minor) return Math.sign(a.minor - b.minor);
  if (a.patch !== b.patch) return Math.sign(a.patch - b.patch);
  const pa = a.prerelease ? a.prerelease.split('.') : [];
  const pb = b.prerelease ? b.prerelease.split('.') : [];
  if (!pa.length && !pb.length) return 0;
  if (!pa.length) return 1;  // no prerelease > prerelease
  if (!pb.length) return -1;
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i], y = pb[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    if (x === y) continue;
    const xn = /^\d+$/.test(x), yn = /^\d+$/.test(y);
    if (xn && yn) return Math.sign(+x - +y);
    if (xn) return -1; // numeric < alphanumeric
    if (yn) return 1;
    return x < y ? -1 : 1;
  }
  return 0;
}
async function routeSemver(u, res, json, body, method) {
  const version = u.searchParams.get('version');
  const a = u.searchParams.get('a'), b = u.searchParams.get('b');
  const sort = u.searchParams.get('sort');
  if (version) {
    const p = parseSemver(version);
    if (!p) return json(res, 400, { valid: false, version, error: 'not valid semver (expected MAJOR.MINOR.PATCH[-prerelease][+build])' });
    return json(res, 200, { valid: true, version, ...p });
  }
  if (a && b) {
    const pa = parseSemver(a), pb = parseSemver(b);
    if (!pa || !pb) return json(res, 400, { error: 'both a and b must be valid semver', a_valid: !!pa, b_valid: !!pb });
    const c = cmp(pa, pb);
    return json(res, 200, { a, b, comparison: c === 0 ? 'equal' : c < 0 ? 'a < b' : 'a > b', result: c });
  }
  if (sort) {
    const versions = sort.split(',').map(s => s.trim()).filter(Boolean);
    const parsed = versions.map(v => ({ v, p: parseSemver(v) }));
    const invalid = parsed.filter(x => !x.p).map(x => x.v);
    if (invalid.length) return json(res, 400, { error: 'invalid semver in list', invalid });
    parsed.sort((x, y) => cmp(x.p, y.p));
    return json(res, 200, { sorted: parsed.map(x => x.v) });
  }
  return json(res, 400, { error: 'provide ?version=1.2.3 | ?a=1.2.3&b=2.0.0 | ?sort=1.0.0,2.0.0' });
}
module.exports = { routeSemver, parseSemver, cmp };
