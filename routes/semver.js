// routes/semver.js — Semantic Versioning parse, compare, validate
// GET /semver?version=1.2.3 | ?compare=1.2.3,1.10.0 | ?satisfies=1.2.3,>=1.0.0
function parse(v) {
  const m = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/.exec(v.trim());
  if (!m) throw new Error(`invalid semver: '${v}'`);
  return { major: +m[1], minor: +m[2], patch: +m[3], prerelease: m[4] || null, build: m[5] || null };
}
function cmp(a, b) {
  if (a.major !== b.major) return Math.sign(a.major - b.major);
  if (a.minor !== b.minor) return Math.sign(a.minor - b.minor);
  if (a.patch !== b.patch) return Math.sign(a.patch - b.patch);
  if (!a.prerelease && !b.prerelease) return 0;
  if (!a.prerelease) return 1; // release > prerelease
  if (!b.prerelease) return -1;
  const pa = a.prerelease.split('.'), pb = b.prerelease.split('.');
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i], y = pb[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const nx = /^\d+$/.test(x), ny = /^\d+$/.test(y);
    if (nx && ny) { if (+x !== +y) return Math.sign(+x - +y); }
    else { if (nx) return -1; if (ny) return 1; if (x !== y) return x < y ? -1 : 1; }
  }
  return 0;
}
function routeSemver(u, res, json) {
  const q = u.searchParams;
  try {
    const v = q.get('version');
    if (v) {
      const p = parse(v);
      return json(res, 200, { input: v, ...p, valid: true, ...normalChecks(p) });
    }
    const compare = q.get('compare');
    if (compare) {
      const [a, b] = compare.split(',').map(s => s.trim());
      if (!a || !b) throw new Error('compare needs two versions: compare=1.2.3,1.10.0');
      const pa = parse(a), pb = parse(b);
      const c = cmp(pa, pb);
      return json(res, 200, {
        a: { version: a, ...pa }, b: { version: b, ...pb },
        result: c < 0 ? 'lt' : c > 0 ? 'gt' : 'eq',
        operator: c < 0 ? '<' : c > 0 ? '>' : '==',
        newer: c > 0 ? a : c < 0 ? b : 'equal'
      });
    }
    const list = q.get('sort');
    if (list) {
      const vs = list.split(',').map(s => s.trim());
      const parsed = vs.map(v => ({ v, p: parse(v) }));
      parsed.sort((x, y) => cmp(x.p, y.p));
      return json(res, 200, { input: vs, sorted: parsed.map(x => x.v), newest: parsed[parsed.length-1].v });
    }
    return json(res, 400, { error: 'provide version=, compare=a,b, or sort=a,b,c' });
  } catch (e) { return json(res, 400, { error: e.message }); }
}
function normalChecks(p) {
  return { isPrerelease: !!p.prerelease, isStable: p.major > 0 && !p.prerelease, isInitialDev: p.major === 0 };
}
module.exports = { routeSemver };
