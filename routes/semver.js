// /semver — semantic version parsing, validation, comparison
function parseSemver(v) {
  const m = v.match(/^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/);
  if (!m) return null;
  return {
    major: +m[1], minor: +m[2], patch: +m[3],
    prerelease: m[4] || null,
    build: m[5] || null
  };
}

function cmpCore(a, b) {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

function cmpPre(a, b) {
  const pa = a.prerelease ? a.prerelease.split('.') : [];
  const pb = b.prerelease ? b.prerelease.split('.') : [];
  if (pa.length === 0 && pb.length === 0) return 0;
  if (pa.length === 0) return 1;  // no prerelease > prerelease
  if (pb.length === 0) return -1;
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i], y = pb[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const xn = /^\d+$/.test(x), yn = /^\d+$/.test(y);
    if (xn && yn) { const d = +x - +y; if (d) return d; }
    else if (xn) return -1;   // numeric < alphanumeric
    else if (yn) return 1;
    else { const c = x.localeCompare(y); if (c) return c; }
  }
  return 0;
}

function routeSemver(u, res, json) {
  const q = u.searchParams;
  const v = (q.get('v') || '').trim();
  const other = (q.get('compare') || '').trim();

  if (!v) {
    return json(res, 400, {
      error: 'provide ?v=1.2.3',
      note: 'Semver 2.0.0 parsing/validation. Add ?compare=1.2.4 to compare two versions.',
      example: '/semver?v=1.2.3&compare=2.0.0'
    });
  }

  const p = parseSemver(v);
  if (!p) {
    return json(res, 200, { valid: false, version: v, error: 'not valid semver (expected [v]MAJOR.MINOR.PATCH[-prerelease][+build])' });
  }

  const out = { valid: true, version: v, parsed: p };
  if (p.prerelease) out.is_prerelease = true;

  if (other) {
    const o = parseSemver(other);
    if (!o) return json(res, 200, { valid: false, version: v, error: 'compare value not valid semver: ' + other });
    const c = cmpCore(p, o) || cmpPre(p, o);
    out.comparison = c < 0 ? 'lt' : c > 0 ? 'gt' : 'eq';
    out.result = c < 0 ? `${v} < ${other}` : c > 0 ? `${v} > ${other}` : `${v} == ${other}`;
  }

  return json(res, 200, out);
}

module.exports = { routeSemver };
