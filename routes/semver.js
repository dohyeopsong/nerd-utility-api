// /semver — parse semver, compare two versions, or test a version against a range
function parse(v) {
  const m = v.trim().match(/^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/);
  if (!m) return null;
  return { major: +m[1], minor: +m[2], patch: +m[3], prerelease: m[4] || null, build: m[5] || null };
}
function cmp(a, b) {
  if (a.major !== b.major) return Math.sign(a.major - b.major);
  if (a.minor !== b.minor) return Math.sign(a.minor - b.minor);
  if (a.patch !== b.patch) return Math.sign(a.patch - b.patch);
  const ap = a.prerelease, bp = b.prerelease;
  if (!ap && !bp) return 0;
  if (!ap) return 1;      // release > prerelease
  if (!bp) return -1;
  const as = ap.split('.'), bs = bp.split('.');
  for (let i = 0; i < Math.max(as.length, bs.length); i++) {
    const x = as[i], y = bs[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const xn = /^\d+$/.test(x), yn = /^\d+$/.test(y);
    if (xn && yn) { if (+x !== +y) return Math.sign(+x - +y); }
    else if (xn) return -1;   // numeric < alphanumeric
    else if (yn) return 1;
    else if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}
function testRange(v, range) {
  // supports: exact, ^x.y.z, ~x.y.z, >x <x >=x <=x, x.y.z - a.b.c, || alternatives, x/* wildcards
  return range.split('||').some(alt => {
    // hyphen range
    const hm = alt.match(/^\s*(\S+)\s+-\s+(\S+)\s*$/);
    if (hm) return cmp(v, parseLoose(hm[1])) >= 0 && cmp(v, parseLoose(hm[2])) <= 0;
    const conds = alt.trim().split(/\s+/).filter(Boolean);
    if (conds.length === 0) return true;
    // exact / wildcard version
    if (conds.length === 1) {
      const c = conds[0];
      if (!/^[><=~^]| - /.test(c)) return matchWild(v, c);
    }
    return conds.every(c => {
      const m = c.match(/^([><]=?|=|~|\^)?(.+)$/);
      const op = m[1] || '=', base = parseLoose(m[2]);
      const r = cmp(v, base);
      if (op === '=') return matchWild(v, m[2]);
      if (op === '>') return r > 0;
      if (op === '>=') return r >= 0;
      if (op === '<') return r < 0;
      if (op === '<=') return r <= 0;
      if (op === '~') { // ~1.2.3 := >=1.2.3 <1.3.0 ; ~1 := >=1.0.0 <2.0.0
        if (r < 0) return false;
        if (m[2].split('.').length === 1) return v.major === base.major;
        return v.major === base.major && v.minor === base.minor;
      }
      if (op === '^') { // ^1.2.3 := >=1.2.3 <2.0.0 ; ^0.2.3 := >=0.2.3 <0.3.0 ; ^0.0.3 := >=0.0.3 <0.0.4
        if (r < 0) return false;
        if (base.major > 0) return v.major === base.major;
        if (base.minor > 0) return v.major === 0 && v.minor === base.minor;
        return v.major === 0 && v.minor === 0 && v.patch === base.patch;
      }
      return false;
    });
  });
}
function parseLoose(s) { // x or x.y -> x.y.0
  const parts = s.replace(/^v/, '').replace(/-.*|\+.*/, '').split('.');
  while (parts.length < 3) parts.push('0');
  return parse(parts.join('.'));
}
function matchWild(v, spec) {
  spec = spec.replace(/^v/, '');
  const sp = spec.split('.');
  const vp = [v.major, v.minor, v.patch];
  for (let i = 0; i < Math.min(sp.length, 3); i++) {
    if (sp[i] === '*' || sp[i] === 'x' || sp[i] === 'X') return true;
    if (parseInt(sp[i]) !== vp[i]) return false;
    if (sp.length - 1 === i && sp.length < 3) return true; // 1.2 matches 1.2.x
  }
  return spec === '' || sp.join('.') === vp.join('.');
}
function routeSemver(u, res, json) {
  const p = u.searchParams;
  const v = p.get('v') || p.get('version');
  const v2 = p.get('v2') || p.get('other');
  const range = p.get('range');
  if (!v) return json(res, 200, { usage: '?v=1.2.3 (parse), ?v=1.2.3&v2=1.10.0 (compare), ?v=1.2.3&range=^1.0.0 (range test)' });
  const pv = parse(v);
  if (!pv) return json(res, 400, { error: `invalid semver: ${v}` });
  const out = { version: pv };
  if (v2) {
    const pv2 = parse(v2);
    if (!pv2) return json(res, 400, { error: `invalid semver: ${v2}` });
    const r = cmp(pv, pv2);
    out.comparison = r === 0 ? 'equal' : r > 0 ? 'greater' : 'less';
    out.result = r; // -1, 0, 1
  }
  if (range) {
    out.satisfies = testRange(pv, range);
    out.range = range;
  }
  return json(res, 200, out);
}
module.exports = { routeSemver };
