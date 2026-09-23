// /semver — semantic versioning parse, compare, and satisfy
function parseSemver(v) {
  const m = String(v).trim().match(/^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/);
  if (!m) return null;
  return { major: +m[1], minor: +m[2], patch: +m[3], prerelease: m[4] || null, build: m[5] || null };
}
function cmp(a, b) { // a<b: -1, a>b: 1
  if (a.major !== b.major) return a.major < b.major ? -1 : 1;
  if (a.minor !== b.minor) return a.minor < b.minor ? -1 : 1;
  if (a.patch !== b.patch) return a.patch < b.patch ? -1 : 1;
  const ap = a.prerelease, bp = b.prerelease;
  if (!ap && bp) return 1; if (ap && !bp) return -1; if (!ap && !bp) return 0;
  const as = ap.split('.'), bs = bp.split('.');
  for (let i = 0; i < Math.max(as.length, bs.length); i++) {
    const x = as[i], y = bs[i];
    if (x === undefined) return -1; if (y === undefined) return 1;
    const xn = /^\d+$/.test(x), yn = /^\d+$/.test(y);
    if (xn && yn) { if (+x !== +y) return +x < +y ? -1 : 1; }
    else { if (x !== y) return x < y ? -1 : 1; }
  }
  return 0;
}
function satisfies(v, range) {
  // supports: ^x.y.z, ~x.y.z, >=x, >x, <x, <=x, =x, x.y.z exact, wildcards *
  const r = range.trim();
  let m;
  if ((m = r.match(/^(\^)(\d+)(?:\.(\d+|x|\*))?(?:\.(\d+|x|\*))?/))) {
    const M = +m[2], mnr = m[3] && /^\d/.test(m[3]) ? +m[3] : 0, pt = m[4] && /^\d/.test(m[4]) ? +m[4] : 0;
    if (v.major !== M) return false;
    if (mnr === 0 && (m[3] === undefined)) return v.major === M;
    if (v.minor < mnr) return false;
    if (v.minor === mnr && v.patch < pt) return false;
    return true;
  }
  if ((m = r.match(/^(\d+|\*)(?:\.(\d+|\*))?(?:\.(\d+|\*))?$/))) {
    if (m[1] !== '*' && v.major !== +m[1]) return false;
    if (m[2] !== undefined && m[2] !== '*' && v.minor !== +m[2]) return false;
    if (m[3] !== undefined && m[3] !== '*' && v.patch !== +m[3]) return false;
    return true;
  }
  if ((m = r.match(/^~(\d+)(?:\.(\d+|x|\*))?(?:\.(\d+|x|\*))?/))) {
    const M = +m[1], mnr = m[2] && /^\d/.test(m[2]) ? +m[2] : null;
    if (v.major !== M) return false;
    if (mnr !== null && v.minor !== mnr) return false;
    return true;
  }
  if ((m = r.match(/^(>=|<=|>|<|=)?\s*v?(\d+)(?:\.(\d+|\*))?(?:\.(\d+|\*))?$/))) {
    const op = m[1] || '=';
    const t = { major: +m[2], minor: m[3] !== undefined && m[3] !== '*' ? +m[3] : (m[3] === undefined ? undefined : 0), patch: m[4] !== undefined && m[4] !== '*' ? +m[4] : (m[4] === undefined ? undefined : 0), prerelease: null };
    const target = { major: t.major, minor: t.minor === undefined ? 0 : t.minor, patch: t.patch === undefined ? 0 : t.patch, prerelease: null };
    const c = cmp(v, target);
    // if partial version given, treat missing parts as wildcard by adjusting
    let result;
    if (t.minor === undefined) { // major-only
      result = op === '=' ? v.major === t.major : op === '>' || op === '>=' ? v.major >= t.major : v.major <= t.major;
    } else if (t.patch === undefined) {
      const same = v.major === t.major && v.minor === t.minor;
      result = op === '=' ? same : op === '>' || op === '>=' ? cmp(v, target) >= 0 : cmp(v, target) <= 0;
    } else {
      result = op === '=' ? c === 0 : op === '>' ? c > 0 : op === '>=' ? c >= 0 : op === '<' ? c < 0 : c <= 0;
    }
    return result;
  }
  return null; // unsupported range
}
function routeSemver(u, res, json) {
  const p = u.searchParams;
  const a = p.get('a'), b = p.get('b'), range = p.get('range'), v = p.get('v');
  if (!a && !b && !range && !v) return json(res, 200, { usage: '?a=1.2.3&b=1.10.0 (compare) | ?range=^1.2.0&v=1.5.0 (satisfy) | ?v=1.2.3-beta.1+build (parse)' });
  if (a && b) {
    const A = parseSemver(a), B = parseSemver(b);
    if (!A) return json(res, 400, { error: 'invalid version a' });
    if (!B) return json(res, 400, { error: 'invalid version b' });
    const c = cmp(A, B);
    return json(res, 200, { comparison: c < 0 ? 'a<b' : c > 0 ? 'a>b' : 'a=b', result: c < 0 ? -1 : c > 0 ? 1 : 0, a: A, b: B });
  }
  if (range && v) {
    const V = parseSemver(v);
    if (!V) return json(res, 400, { error: 'invalid version v' });
    const s = satisfies(V, range);
    if (s === null) return json(res, 400, { error: 'unsupported range syntax' });
    return json(res, 200, { satisfies: s, version: V, range });
  }
  if (v) {
    const V = parseSemver(v);
    if (!V) return json(res, 400, { error: 'invalid semver' });
    return json(res, 200, V);
  }
  return json(res, 400, { error: 'see usage' });
}
module.exports = { routeSemver, parseSemver, cmp };
