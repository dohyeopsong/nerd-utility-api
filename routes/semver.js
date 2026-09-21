// /semver?versions=1.2.3,1.10.0,1.2.3-beta.1&order=desc → sort by semver.org precedence
function parseSemver(v) {
  const m = v.trim().match(/^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/);
  if (!m) return null;
  return { major: +m[1], minor: +m[2], patch: +m[3], pre: m[4] ? m[4].split('.') : null, raw: v.trim() };
}
function cmpIdentifiers(a, b) {
  if (a === null && b === null) return 0;
  if (a === null) return 1;   // no prerelease > prerelease
  if (b === null) return -1;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const x = a[i], y = b[i];
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
function cmp(a, b) {
  if (a.major !== b.major) return a.major < b.major ? -1 : 1;
  if (a.minor !== b.minor) return a.minor < b.minor ? -1 : 1;
  if (a.patch !== b.patch) return a.patch < b.patch ? -1 : 1;
  return cmpIdentifiers(a.pre, b.pre);
}
function routeSemver(u, res, json) {
  const versions = (u.searchParams.get('versions') || '').split(',').map(s => s.trim()).filter(Boolean);
  if (versions.length === 0) return json(res, 400, { error: 'pass versions=1.2.3,2.0.0,...', note: 'supports prerelease (-beta.1) and build (+meta, ignored in precedence)' });
  const parsed = [];
  const errors = [];
  for (const v of versions) {
    const p = parseSemver(v);
    if (!p) errors.push(v); else parsed.push(p);
  }
  if (errors.length) return json(res, 400, { error: 'invalid semver', invalid: errors });
  const order = (u.searchParams.get('order') || 'asc').toLowerCase();
  parsed.sort(cmp);
  if (order === 'desc') parsed.reverse();
  return json(res, 200, {
    sorted: parsed.map(p => p.raw),
    count: parsed.length,
    latest: order === 'desc' ? parsed[0].raw : parsed[parsed.length - 1].raw,
    order
  });
}
module.exports = { routeSemver, parseSemver, cmp };
