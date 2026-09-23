// /semver — parse, validate, compare, and sort semantic versions (semver.org)
const RE = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/;
function parse(s) {
  const m = RE.exec(String(s).trim());
  if (!m) return null;
  const [_, ma, mi, pa, pre, build] = m;
  if (pre && !/^[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*$/.test(pre)) return null;
  if (build && !/^[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*$/.test(build)) return null;
  return { major:+ma, minor:+mi, patch:+pa, prerelease:pre||null, build:build||null };
}
function preKey(pre) { // compare prerelease identifiers per spec
  if (!pre) return []; // release > prerelease
  return pre.split('.').map(id => /^\d+$/.test(id) ? +id : id);
}
function cmpPre(a, b) {
  const A = preKey(a.prerelease), B = preKey(b.prerelease);
  if (A.length === 0 && B.length === 0) return 0;
  if (A.length === 0) return 1;  // a is release, b is pre -> a greater
  if (B.length === 0) return -1;
  for (let i = 0; i < Math.max(A.length, B.length); i++) {
    const x = A[i], y = B[i];
    if (x === undefined) return -1; // shorter set of ids is lower
    if (y === undefined) return 1;
    if (x === y) continue;
    if (typeof x === 'number' && typeof y === 'number') return x < y ? -1 : 1;
    if (typeof x === 'number') return -1; // numeric ids < alphanumeric
    if (typeof y === 'number') return 1;
    return x < y ? -1 : 1;
  }
  return 0;
}
function compare(a, b) {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  if (a.patch !== b.patch) return a.patch - b.patch;
  return cmpPre(a, b); // build metadata ignored
}
function routeSemver(u, res, json) {
  const p = u.searchParams;
  const v = p.get('v'), other = p.get('to'), list = p.get('sort');
  if (!v && !list) return json(res, 200, { usage: '?v=1.2.3 (parse) | ?v=1.2.3&to=1.3.0 (compare) | ?sort=1.0.0,2.1.0,1.9.9 (sort ascending)' });
  if (list) {
    const items = list.split(',').map(s => s.trim());
    const parsed = items.map(s => ({ s, v: parse(s) }));
    const bad = parsed.filter(x => !x.v).map(x => x.s);
    if (bad.length) return json(res, 422, { error: 'invalid semver', invalid: bad });
    const sorted = parsed.map(x => x.v).sort(compare);
    return json(res, 200, { sorted_ascending: sorted.map(fmt), greatest: fmt(sorted[sorted.length-1]), lowest: fmt(sorted[0]) });
  }
  const a = parse(v);
  if (!a) return json(res, 422, { error: 'invalid semver', input: v, hint: 'expected MAJOR.MINOR.PATCH[-prerelease][+build]' });
  if (other) {
    const b = parse(other);
    if (!b) return json(res, 422, { error: 'invalid semver', input: other });
    const c = compare(a, b);
    return json(res, 200, { a: fmt(a), b: fmt(b), comparison: c < 0 ? 'lt' : c > 0 ? 'gt' : 'eq',
      summary: c === 0 ? 'equal' : `${fmt(c<0?a:b)} is newer than ${fmt(c<0?b:a)}` });
  }
  return json(res, 200, { input: v, valid: true, ...a });
}
function fmt(v) { let s = `${v.major}.${v.minor}.${v.patch}`; if (v.prerelease) s += '-'+v.prerelease; if (v.build) s += '+'+v.build; return s; }
module.exports = { routeSemver };
