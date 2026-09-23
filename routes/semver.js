// /semver — parse, compare, and range-test semantic versions (SemVer 2.0.0)
function parseSemver(v) {
  const m = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/.exec(v.trim());
  if (!m) return null;
  return { major: +m[1], minor: +m[2], patch: +m[3], prerelease: m[4] ? m[4].split('.') : [], build: m[5] || null };
}
function cmp(a, b) {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  if (a.patch !== b.patch) return a.patch - b.patch;
  const ar = a.prerelease, br = b.prerelease;
  if (!ar.length && !br.length) return 0;
  if (!ar.length) return 1;   // release > prerelease
  if (!br.length) return -1;
  for (let i = 0; i < Math.max(ar.length, br.length); i++) {
    if (i >= ar.length) return -1;
    if (i >= br.length) return 1;
    const x = ar[i], y = br[i];
    const xn = /^\d+$/.test(x), yn = /^\d+$/.test(y);
    if (xn && yn) { if (+x !== +y) return +x - +y; }
    else if (xn) return -1;   // numeric < alphanumeric
    else if (yn) return 1;
    else if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}
function satisfies(v, range) {
  // supports: exact, ~x.y.z, ^x.y.z, >x <y >=x <=x, x.y.z - a.b.c hyphen ranges, ||, *
  for (const alt of range.split(/\s*\|\|\s*/)) {
    if (alt.trim() === '*' || alt.trim() === '') return true;
    let ok = true;
    // hyphen range: 1.2.3 - 2.3.4
    const hy = /^(.+?)\s+-\s+(.+)$/.exec(alt);
    if (hy) {
      const lo = parseSemver(hy[1]), hi = parseSemver(hy[2]);
      if (!lo || !hi || cmp(v, lo) < 0 || cmp(v, hi) > 0) ok = false;
      else continue;
    }
    for (const part of alt.trim().split(/\s+/)) {
      const m = /^(~|\^|>=|<=|>|<|=)?\s*v?(.+)$/.exec(part);
      if (!m) { ok = false; break; }
      const op = m[1] || '=';
      const r = parseSemver(m[2]);
      if (!r) { if (m[2] !== '*') { ok = false; break; } else continue; }
      const c = cmp(v, r);
      let pass;
      if (op === '>') pass = c > 0;
      else if (op === '>=') pass = c >= 0;
      else if (op === '<') pass = c < 0;
      else if (op === '<=') pass = c <= 0;
      else if (op === '~') pass = c >= 0 && v.major === r.major && v.minor === r.minor;
      else if (op === '^') pass = c >= 0 && (r.major > 0 ? v.major === r.major : v.minor === r.minor);
      else pass = c === 0;
      if (!pass) { ok = false; break; }
    }
    if (ok) return true;
  }
  return false;
}
function routeSemver(u, res, json) {
  const p = u.searchParams;
  const a = p.get('a'), b = p.get('b'), range = p.get('range');
  if (!a && !range) return json(res, 200, { usage: '?a=1.2.3&b=2.0.0 (compare) or ?a=1.2.3&range=^1.0.0 (satisfies). Ops: =,>,>=,<,<=,~,^, hyphen ranges, ||' });
  if (a && b) {
    const va = parseSemver(a), vb = parseSemver(b);
    if (!va) return json(res, 400, { error: `invalid semver: ${a}` });
    if (!vb) return json(res, 400, { error: `invalid semver: ${b}` });
    const c = cmp(va, vb);
    return json(res, 200, { a: { version: a, ...va }, b: { version: b, ...vb }, comparison: c === 0 ? 'equal' : c > 0 ? 'a > b' : 'a < b' });
  }
  if (a && range) {
    const va = parseSemver(a);
    if (!va) return json(res, 400, { error: `invalid semver: ${a}` });
    return json(res, 200, { version: a, range, satisfies: satisfies(va, range) });
  }
  return json(res, 400, { error: 'provide ?a= with ?b= (compare) or &range= (satisfies)' });
}
module.exports = { routeSemver };
