// Semver comparator/sorter (semver.org precedence)
function parseSemver(v) {
  const m = String(v).trim().match(/^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/);
  if (!m) throw new Error('invalid semver: ' + v);
  return { major: +m[1], minor: +m[2], patch: +m[3], prerelease: m[4] || null, build: m[5] || null };
}
function cmpSemver(a, b) {
  const A = parseSemver(a), B = parseSemver(b);
  for (const k of ['major','minor','patch']) {
    if (A[k] !== B[k]) return A[k] < B[k] ? -1 : 1;
  }
  const ap = A.prerelease, bp = B.prerelease;
  if (!ap && bp) return 1;
  if (ap && !bp) return -1;
  if (ap && bp) {
    const aa = ap.split('.'), bb = bp.split('.');
    for (let i = 0; i < Math.max(aa.length, bb.length); i++) {
      const x = aa[i], y = bb[i];
      if (x === undefined) return -1;
      if (y === undefined) return 1;
      const xn = /^\d+$/.test(x), yn = /^\d+$/.test(y);
      if (xn && yn) { if (+x !== +y) return +x < +y ? -1 : 1; }
      else if (xn !== yn) return xn ? -1 : 1;
      else if (x !== y) return x < y ? -1 : 1;
    }
  }
  return 0;
}
function routeSemver(u, res, json) {
  const q = Object.fromEntries(new URL(u, 'http://x').searchParams);
  const raw = q.versions || q.version || q.number;
  if (!raw) return json(res, 400, { error: 'provide ?versions=1.0.0,2.1.0,...' });
  const versions = raw.split(',').map(s => s.trim()).filter(Boolean);
  try { versions.map(parseSemver); } catch (e) { return json(res, 400, { error: e.message }); }
  const sorted = [...versions].sort(cmpSemver);
  return json(res, 200, { input: versions, sortedAsc: sorted, latest: sorted[sorted.length-1], oldest: sorted[0] });
}
module.exports = { routeSemver, parseSemver, cmpSemver };
