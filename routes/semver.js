// /semver — parse, compare, and validate semantic versions (semver.org)
function parseSemver(v) {
  const m = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/.exec(String(v).trim());
  if (!m) return null;
  const [_, major, minor, patch, pre, build] = m;
  return { major: +major, minor: +minor, patch: +patch, prerelease: pre || '', build: build || '' };
}

function cmpPre(a, b) {
  if (!a && !b) return 0;
  if (!a) return 1;   // no prerelease > prerelease
  if (!b) return -1;
  const A = a.split('.'), B = b.split('.');
  for (let i = 0; i < Math.max(A.length, B.length); i++) {
    const x = A[i], y = B[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const xn = /^\d+$/.test(x), yn = /^\d+$/.test(y);
    if (xn && yn) { if (+x !== +y) return +x < +y ? -1 : 1; }
    else if (xn) return -1; // numeric < alphanumeric
    else if (yn) return 1;
    else if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

function compare(a, b) {
  const pa = parseSemver(a), pb = parseSemver(b);
  if (!pa || !pb) return null;
  for (const k of ['major', 'minor', 'patch']) {
    if (pa[k] !== pb[k]) return pa[k] < pb[k] ? -1 : 1;
  }
  return cmpPre(pa.prerelease, pb.prerelease);
}

function routeSemver(u, res, json) {
  const p = u.searchParams;
  const a = p.get('a') || p.get('v') || '';
  const b = p.get('b');
  const v = p.get('valid') || '';

  if (v) {
    const parsed = parseSemver(v);
    return json(res, 200, { input: v, valid: !!parsed, parsed });
  }
  if (!a || !b) {
    return json(res, 200, { usage: '?a=1.2.3&b=2.0.0 (compare) | ?valid=1.2.3-rc.1 (validate/parse) | ?satisfies=1.2.3&range=>=1.0.0 <2.0.0 (loose range check)' });
  }
  const c = compare(a, b);
  if (c === null) return json(res, 400, { error: 'invalid semver', a, b });
  const op = c === 0 ? '==' : c < 0 ? '<' : '>';
  return json(res, 200, { a, b, comparison: c, relation: op, newer: c > 0 ? a : c < 0 ? b : 'equal' });
}

module.exports = { routeSemver };
