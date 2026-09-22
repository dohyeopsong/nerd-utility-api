// /semver — parse, compare, and test semver versions against ranges (caret/tilde)
function parseSemver(v) {
  const m = v.trim().match(/^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/);
  if (!m) return null;
  return { major: +m[1], minor: +m[2], patch: +m[3], prerelease: m[4] || '', build: m[5] || '' };
}
function cmp(a, b) {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  if (a.patch !== b.patch) return a.patch - b.patch;
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
    if (xn && yn) { if (+x !== +y) return +x - +y; }
    else if (xn) return -1;
    else if (yn) return 1;
    else if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}
function satisfies(v, range) {
  // supports: ^x.y.z  ~x.y.z  >=x.y.z  >x.y.z  <x.y.z  =x.y.z  x.y.z  wildcards *
  range = range.trim();
  let m;
  if ((m = range.match(/^([\^~])v?(\d+)(?:\.(\d+|\*))?(?:\.(\d+|\*))?$/))) {
    const [, op, M, mnr, p] = m;
    const mm = mnr === undefined || mnr === '*' ? null : +mnr;
    const pp = p === undefined || p === '*' ? null : +p;
    if (op === '^') {
      if (v.major !== +M) return false;
      if (+M > 0) return v.minor >= (mm ?? 0);
      if (mm === null) return true;
      if (v.minor !== mm) return false;
      return v.patch >= (pp ?? 0);
    }
    // tilde
    if (+M !== v.major) return false;
    if (mm === null) return true;
    if (v.minor !== mm) return false;
    if (pp === null) return true;
    return v.patch >= pp;
  }
  if ((m = range.match(/^(>=|<=|>|<|=|)\s*v?(\d+)(?:\.(\d+|\*))?(?:\.(\d+|\*))?$/))) {
    let [, op, M, mnr, p] = m;
    const hasMinor = mnr !== undefined && mnr !== '*';
    const hasPatch = p !== undefined && p !== '*';
    const b = { major: +M, minor: hasMinor ? +mnr : 0, patch: hasPatch ? +p : 0, prerelease: '' };
    // For bare major or major.minor, treat as range
    if (!op && (!hasMinor || !hasPatch)) {
      if (v.major !== b.major) return false;
      if (hasMinor && v.minor !== b.minor) return false;
      return true;
    }
    const c = cmp(v, b);
    switch (op) {
      case '>': return c > 0;
      case '<': return c < 0;
      case '>=': return c >= 0;
      case '<=': return c <= 0;
      case '=': case '': return c === 0;
    }
  }
  if (range.includes(' - ')) {
    const [lo, hi] = range.split(' - ');
    return satisfies(v, '>=' + lo.trim()) && satisfies(v, '<=' + hi.trim());
  }
  // space-separated AND of comparators
  if (/\s/.test(range)) return range.trim().split(/\s+/).every(r => satisfies(v, r));
  return false;
}
function routeSemver(u, res, json) {
  const q = u.searchParams;
  const version = q.get('version') || '';
  const range = q.get('range') || '';
  const other = q.get('compare') || '';
  const v = parseSemver(version);
  if (!version) return json(res, 400, { error: 'version required' });
  if (!v) return json(res, 400, { error: 'invalid semver: ' + version });
  const out = { version, major: v.major, minor: v.minor, patch: v.patch, prerelease: v.prerelease || undefined, build: v.build || undefined };
  if (other) {
    const o = parseSemver(other);
    if (!o) return json(res, 400, { error: 'invalid semver to compare: ' + other });
    const c = cmp(v, o);
    out.comparison = c === 0 ? 'equal' : c > 0 ? 'greater' : 'less';
  }
  if (range) out.satisfies_range = satisfies(v, range);
  return json(res, 200, out);
}
module.exports = { routeSemver };
