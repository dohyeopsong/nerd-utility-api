// /semver — parse, validate, compare, and sort semantic versions (semver.org)
function parseSemver(v) {
  const m = v.match(/^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/);
  if (!m) return null;
  return { major: +m[1], minor: +m[2], patch: +m[3], prerelease: m[4] || null, build: m[5] || null };
}
function cmpPre(a, b) {
  if (!a && !b) return 0;
  if (!a) return 1;  // no prerelease > prerelease
  if (!b) return -1;
  const pa = a.split('.'), pb = b.split('.');
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i], y = pb[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const xn = /^\d+$/.test(x), yn = /^\d+$/.test(y);
    if (xn && yn) { if (+x !== +y) return +x < +y ? -1 : 1; }
    else if (xn) return -1;
    else if (yn) return 1;
    else if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}
function cmp(a, b) {
  if (a.major !== b.major) return a.major < b.major ? -1 : 1;
  if (a.minor !== b.minor) return a.minor < b.minor ? -1 : 1;
  if (a.patch !== b.patch) return a.patch < b.patch ? -1 : 1;
  const p = cmpPre(a.prerelease, b.prerelease);
  return p;
}
function satisfies(v, range) {
  // supports: exact, ^x.y.z, ~x.y.z, >x, >=x, <x, <=x, x.y.z - x.y.z (hyphen), || unions
  let satisfied = false;
  for (const part of range.split(/\s*\|\|\s*/)) {
    if (satisfiesSingle(v, part.trim())) { satisfied = true; break; }
  }
  return satisfied;
}
function satisfiesSingle(v, r) {
  if (!r) return false;
  // hyphen range
  const hy = r.match(/^([\d*.]+(?:-[\w.-]+)?)\s+-\s+([\d*.]+(?:-[\w.-]+)?)$/);
  if (hy) { return cmp(v, parseOrPartial(hy[1])) >= 0 && cmp(v, parseOrPartial(hy[2])) <= 0; }
  // comma = AND
  const parts = r.split(/\s*,\s*/);
  return parts.every(p => satisfiesAtom(v, p.trim()));
}
function parseOrPartial(s) {
  // partial like 1.2 or 1 or * — fill zeros
  if (s === '*' || s === 'x' || s === 'X') return { major: 0, minor: 0, patch: 0, prerelease: null };
  const m = s.match(/^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:-([\w.-]+))?$/);
  if (!m) return { major: 0, minor: 0, patch: 0, prerelease: null };
  return { major: +m[1], minor: m[2] ? +m[2] : 0, patch: m[3] ? +m[3] : 0, prerelease: m[4] || null };
}
function satisfiesAtom(v, a) {
  const m = a.match(/^(\^|~)?v?([\d*.]+(?:-[\w.-]+)?)$/);
  if (m) {
    const base = parseOrPartial(m[2]);
    if (m[1] === '^') {
      if (v.major !== base.major) return false;
      if (v.major === 0 && base.minor > 0 && v.minor !== base.minor) return false;
      if (v.major === 0 && base.minor === 0 && v.patch !== base.patch) return false;
      return cmp(v, base) >= 0;
    }
    if (m[1] === '~') {
      if (v.major !== base.major || v.minor !== base.minor) return false;
      return cmp(v, base) >= 0;
    }
    return cmp(v, base) === 0;
  }
  const op = a.match(/^(>=|<=|>|<|=)\s*v?([\d*.]+(?:-[\w.-]+)?)$/);
  if (op) {
    const base = parseOrPartial(op[2]);
    const c = cmp(v, base);
    switch (op[1]) {
      case '>': return c > 0; case '>=': return c >= 0;
      case '<': return c < 0; case '<=': return c <= 0;
      case '=': return c === 0;
    }
  }
  return false;
}
function routeSemver(u, res, json) {
  const q = u.searchParams;
  const a = q.get('a') || '', b = q.get('b') || '';
  const list = q.get('sort') || '';
  const range = q.get('range') || '';
  if (list) {
    const vers = list.split(',').map(s => s.trim()).filter(Boolean);
    const parsed = vers.map(v => ({ raw: v, p: parseSemver(v) }));
    const bad = parsed.filter(x => !x.p).map(x => x.raw);
    if (bad.length) return json(res, 400, { error: 'invalid semver: ' + bad.join(', ') });
    const sorted = parsed.slice().sort((x, y) => cmp(x.p, y.p)).map(x => x.raw);
    return json(res, 200, { input: vers, sorted, latest: sorted[sorted.length - 1], oldest: sorted[0] });
  }
  if (range) {
    const version = a;
    if (!version) return json(res, 400, { error: 'a= (version) required with range=' });
    const p = parseSemver(version);
    if (!p) return json(res, 400, { error: 'invalid semver: ' + version });
    return json(res, 200, { version, range, satisfies: satisfies(p, range) });
  }
  if (!a || !b) return json(res, 400, { error: 'a= and b= required (or sort=, or a= with range=)' });
  const pa = parseSemver(a), pb = parseSemver(b);
  if (!pa) return json(res, 400, { error: 'invalid semver: ' + a });
  if (!pb) return json(res, 400, { error: 'invalid semver: ' + b });
  const c = cmp(pa, pb);
  return json(res, 200, {
    a, b,
    comparison: c === 0 ? '=' : c < 0 ? '<' : '>',
    equal: c === 0,
    newer: c > 0 ? a : b,
    a_parsed: pa, b_parsed: pb
  });
}
module.exports = { routeSemver };
