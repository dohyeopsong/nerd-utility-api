// Semver comparator/sorter: semver.org spec precedence
function parseSemver(v) {
  const m = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/.exec(v.trim());
  if (!m) return null;
  return { major: +m[1], minor: +m[2], patch: +m[3], pre: m[4] || null, build: m[5] || null };
}
const NUM = /^\d+$/;
function cmpPre(a, b) {
  if (!a && !b) return 0;
  if (!a) return 1;  // no prerelease > prerelease
  if (!b) return -1;
  const A = a.split('.'), B = b.split('.');
  for (let i = 0; i < Math.max(A.length, B.length); i++) {
    const x = A[i], y = B[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    if (x === y) continue;
    if (NUM.test(x) && NUM.test(y)) return (+x < +y) ? -1 : 1;
    if (NUM.test(x)) return -1; // numeric < alphanumeric
    if (NUM.test(y)) return 1;
    return x < y ? -1 : 1;
  }
  return 0;
}
function cmp(a, b) {
  const A = parseSemver(a), B = parseSemver(b);
  if (!A || !B) return null;
  if (A.major !== B.major) return A.major - B.major;
  if (A.minor !== B.minor) return A.minor - B.minor;
  if (A.patch !== B.patch) return A.patch - B.patch;
  return cmpPre(A.pre, B.pre);
}
function routeSemver(u, res, json) {
  const single = u.searchParams.get('v') || u.searchParams.get('version');
  if (single) {
    const p = parseSemver(single);
    if (!p) return json(res, 400, { error: 'invalid semver: ' + single });
    return json(res, 200, { input: single, valid: true, ...p });
  }
  const list = (u.searchParams.get('list') || u.searchParams.get('versions') || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!list.length) return json(res, 400, { error: 'provide ?v=VERSION or ?list=v1,v2,...' });
  for (const v of list) if (!parseSemver(v)) return json(res, 400, { error: 'invalid semver: ' + v });
  if (list.length === 2) {
    const c = cmp(list[0], list[1]);
    const rel = c < 0 ? '<' : c > 0 ? '>' : '=';
    return json(res, 200, { a: list[0], b: list[1], relation: rel });
  }
  const sorted = [...list].sort((a, b) => cmp(a, b));
  return json(res, 200, { input: list, sorted, latest: sorted[sorted.length - 1] });
}
module.exports = { routeSemver };
