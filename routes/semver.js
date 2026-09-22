// /semver — semantic versioning utilities
function parseV(s) {
  const m = s.match(/^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/);
  if (!m) throw new Error(`invalid semver: ${s}`);
  return { major: +m[1], minor: +m[2], patch: +m[3], prerelease: m[4] ? m[4].split('.') : null };
}
function cmp(a, b) {
  const A = parseV(a), B = parseV(b);
  for (const k of ['major', 'minor', 'patch']) {
    if (A[k] !== B[k]) return A[k] < B[k] ? -1 : 1;
  }
  // prerelease rules: no prerelease > has prerelease
  if (!A.prerelease && !B.prerelease) return 0;
  if (!A.prerelease) return 1;
  if (!B.prerelease) return -1;
  for (let i = 0; i < Math.max(A.prerelease.length, B.prerelease.length); i++) {
    const x = A.prerelease[i], y = B.prerelease[i];
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
function satisfies(v, range) {
  // supports ^, ~, >=, >, <=, <, =, exact, and comma-separated AND groups
  for (const part of range.split(/\s*,\s*|\s+&&\s+/)) {
    let m = part.match(/^(\^|~|>=|<=|>|<|=)?\s*v?([\d.]+(?:-[0-9A-Za-z.-]+)?)$/);
    if (!m) return false;
    const [_, op, ver] = m;
    if (op === '=' || !op) { if (cmp(v, ver) !== 0) return false; }
    else if (op === '^') {
      const V = parseV(ver);
      const hi = V.major > 0 ? `${V.major + 1}.0.0` : `${V.major}.${V.minor + 1}.0`;
      if (cmp(v, ver) < 0 || cmp(v, hi) >= 0) return false;
    } else if (op === '~') {
      const V = parseV(ver);
      const hi = `${V.major}.${V.minor + 1}.0`;
      if (cmp(v, ver) < 0 || cmp(v, hi) >= 0) return false;
    } else {
      const c = cmp(v, ver);
      if (!(c === 0 && op.includes('=') || c < 0 && op === '<' || c > 0 && op === '>')) return false;
    }
  }
  return true;
}

function routeSemver(u, res, json) {
  const q = u.searchParams;
  try {
    const a = q.get('a'), b = q.get('b'), range = q.get('range'), version = q.get('version');
    if (range && version) {
      const ok = satisfies(version, range);
      return json(res, 200, { version, range, satisfies: ok });
    }
    if (!a || !b) throw new Error('provide ?a=X.Y.Z&b=X.Y.Z, or ?version=X&range=^1.2');
    const c = cmp(a, b);
    return json(res, 200, {
      a, b,
      comparison: c === 0 ? 'equal' : c < 0 ? 'a<b' : 'a>b',
      latest: c === 0 ? a : c > 0 ? a : b,
      diff: (() => {
        const A = parseV(a), B = parseV(b);
        for (const k of ['major', 'minor', 'patch']) if (A[k] !== B[k]) return k;
        return 'none';
      })(),
    });
  } catch (e) {
    return json(res, 400, { error: e.message, example: '/semver?a=1.2.3&b=1.10.0 or /semver?version=1.5.0&range=^1.2' });
  }
}
module.exports = { routeSemver };
