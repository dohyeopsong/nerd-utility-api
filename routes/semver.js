// Semver parser/comparator/sorter per semver.org spec
function parse(v) {
  const m = String(v).trim().match(/^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/);
  if (!m) return null;
  return { major: +m[1], minor: +m[2], patch: +m[3], prerelease: m[4] ? m[4].split('.') : null, raw: String(v).trim() };
}
function cmpIdent(a, b) {
  const na = /^\d+$/.test(a), nb = /^\d+$/.test(b);
  if (na && nb) return Math.sign(+a - +b);
  if (na) return -1;  // numeric < alphanumeric
  if (nb) return 1;
  return a === b ? 0 : (a < b ? -1 : 1);
}
function compare(a, b) {
  const A = parse(a), B = parse(b);
  if (!A || !B) return null;
  for (const k of ['major','minor','patch']) {
    if (A[k] !== B[k]) return Math.sign(A[k] - B[k]);
  }
  if (!A.prerelease && !B.prerelease) return 0;
  if (!A.prerelease) return 1;   // no prerelease > prerelease
  if (!B.prerelease) return -1;
  const n = Math.max(A.prerelease.length, B.prerelease.length);
  for (let i = 0; i < n; i++) {
    if (A.prerelease[i] === undefined) return -1;
    if (B.prerelease[i] === undefined) return 1;
    const c = cmpIdent(A.prerelease[i], B.prerelease[i]);
    if (c) return c;
  }
  return 0;
}
function satisfies(v, range) {
  // supports: exact, X ranges (1.x, 1.2.x, *), comparators (>1.2.3, >=, <, <=), ~ and ^
  const r = String(range).trim();
  if (r === '*' || r === 'x' || r === '') return true;
  const cmpMatch = r.match(/^(>=|<=|>|<|=)\s*(.+)$/);
  if (cmpMatch) {
    const c = cmpMatch[1], t = parse(cmpMatch[2]);
    if (!t) return false;
    const d = compare(v, cmpMatch[2]);
    if (d === null) return false;
    return c === '=' ? d === 0 : c === '>' ? d > 0 : c === '<' ? d < 0 : c === '>=' ? d >= 0 : d <= 0;
  }
  // ~ and ^ ranges
  let base = r;
  let mode = null;
  if (r.startsWith('~')) { mode = 'tilde'; base = r.slice(1); }
  else if (r.startsWith('^')) { mode = 'caret'; base = r.slice(1); }
  if (mode) {
    const t = parse(base);
    if (!t) return false;
    if (mode === 'tilde') return satisfies(v, '>=' + t.major + '.' + t.minor + '.0') && (t.patch > 0 || t.prerelease ? satisfies(v, '<' + t.major + '.' + (t.minor + 1) + '.0') : satisfies(v, '<' + t.major + '.' + (t.minor + 1) + '.0'));
    // caret
    if (t.major > 0) return satisfies(v, '>=' + t.major + '.0.0') && satisfies(v, '<' + (t.major + 1) + '.0.0');
    if (t.minor > 0) return satisfies(v, '>=0.' + t.minor + '.0') && satisfies(v, '<0.' + (t.minor + 1) + '.0');
    return satisfies(v, '>=0.0.' + t.patch) && satisfies(v, '<0.0.' + (t.patch + 1));
  }
  // X ranges: 1.x, 1.2.x, 1, 1.2
  const parts = base.split('.');
  const V = parse(v);
  if (!V) return false;
  if (parts.length <= 3) {
    if (parts[0] === '*' || parts[0] === 'x' || parts[0] === 'X') return true;
    if (+parts[0] !== V.major) return false;
    if (parts.length === 1) return !V.prerelease;
    if (parts[1] === '*' || parts[1] === 'x' || parts[1] === 'X') return !V.prerelease;
    if (+parts[1] !== V.minor) return false;
    if (parts.length === 2) return !V.prerelease;
    if (parts[2] === '*' || parts[2] === 'x' || parts[2] === 'X') return !V.prerelease;
    if (parse(base)) return compare(v, base) === 0;
  }
  return compare(v, base) === 0;
}
function routeSemver(u, res, json) {
  const q = Object.fromEntries(new URL(u, 'http://x').searchParams);
  if (q.sort) {
    const list = q.sort.split(',').map(s => s.trim()).filter(Boolean);
    const sorted = list.slice().sort((a, b) => compare(a, b));
    if (sorted.some(x => x === undefined)) return json(res, 400, { error: 'invalid version in list' });
    return json(res, 200, { sorted });
  }
  if (q.a && q.b) {
    const d = compare(q.a, q.b);
    if (d === null) return json(res, 400, { error: 'invalid version string' });
    return json(res, 200, { a: q.a, b: q.b, result: d === 0 ? 'equal' : d < 0 ? 'a < b' : 'a > b', diff: d });
  }
  if (q.v && q.range) {
    const V = parse(q.v);
    if (!V) return json(res, 400, { error: 'invalid ?v= version' });
    return json(res, 200, { version: q.v, range: q.range, satisfies: satisfies(q.v, q.range) });
  }
  if (q.v) {
    const V = parse(q.v);
    if (!V) return json(res, 400, { error: 'invalid ?v= version' });
    return json(res, 200, V);
  }
  return json(res, 400, { error: 'use ?a=&b= (compare), ?sort=v1,v2,... (sort), or ?v=&range= (range check)' });
}
module.exports = { routeSemver, compare, satisfies, parse };
