// /semver — semantic version parsing, comparison, range checks
function parse(v) {
  const m = String(v).trim().match(/^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/);
  if (!m) return null;
  return { major: +m[1], minor: +m[2], patch: +m[3], prerelease: m[4] || null, build: m[5] || null };
}

function cmp(a, b) {
  // a, b already parsed
  for (const k of ['major', 'minor', 'patch']) {
    if (a[k] !== b[k]) return a[k] - b[k];
  }
  // prerelease rules: version without prerelease > version with prerelease
  if (!a.prerelease && b.prerelease) return 1;
  if (a.prerelease && !b.prerelease) return -1;
  if (a.prerelease && b.prerelease) {
    const pa = a.prerelease.split('.'), pb = b.prerelease.split('.');
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const x = pa[i], y = pb[i];
      if (x === undefined) return -1;
      if (y === undefined) return 1;
      const nx = /^\d+$/.test(x), ny = /^\d+$/.test(y);
      if (nx && ny) { if (+x !== +y) return +x - +y; }
      else if (nx) return -1; // numeric < alphanumeric
      else if (ny) return 1;
      else if (x !== y) return x < y ? -1 : 1;
    }
  }
  return 0;
}

function routeSemver(u, res, json) {
  const q = u.searchParams;
  const a = q.get('a') || q.get('version') || '';
  const b = q.get('b') || '';
  const c = q.get('compare') || '';

  if (!a && !b && !c) {
    return json(res, 400, {
      error: 'provide ?version=1.2.3 (parse) or ?a=1.2.3&b=1.10.0 (compare)',
      examples: ['/semver?version=1.2.3-alpha.1+build.5', '/semver?a=1.2.3&b=1.10.0']
    });
  }

  // parse mode
  if (a && !b) {
    const p = parse(a);
    if (!p) return json(res, 200, { input: a, valid: false, reason: 'not valid semver (expected MAJOR.MINOR.PATCH[-prerelease][+build])' });
    return json(res, 200, Object.assign({ input: a, valid: true }, p));
  }

  // compare mode
  const va = parse(a), vb = parse(b);
  if (!va || !vb) {
    return json(res, 200, {
      valid: false,
      error: !va ? `invalid semver: ${a}` : `invalid semver: ${b}`
    });
  }
  const c2 = cmp(va, vb);
  return json(res, 200, {
    a, b,
    valid: true,
    result: c2 === 0 ? 'equal' : c2 < 0 ? 'a < b' : 'a > b',
    newer: c2 === 0 ? 'neither' : c2 < 0 ? 'b' : 'a'
  });
}

module.exports = { routeSemver, parse, cmp };
