// /semver — semantic version utilities
function parseSemver(v) {
  const m = v.match(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/);
  if (!m) return null;
  return { major: +m[1], minor: +m[2], patch: +m[3], prerelease: m[4] || null, build: m[5] || null };
}
function cmpSemver(a, b) {
  if (a.major !== b.major) return Math.sign(a.major - b.major);
  if (a.minor !== b.minor) return Math.sign(a.minor - b.minor);
  if (a.patch !== b.patch) return Math.sign(a.patch - b.patch);
  const pa = a.prerelease ? a.prerelease.split('.') : null;
  const pb = b.prerelease ? b.prerelease.split('.') : null;
  if (!pa && !pb) return 0;
  if (!pa) return 1;   // release > prerelease
  if (!pb) return -1;
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i], y = pb[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const xn = /^\d+$/.test(x), yn = /^\d+$/.test(y);
    if (xn && yn) { if (+x !== +y) return Math.sign(+x - +y); }
    else if (xn) return -1;
    else if (yn) return 1;
    else if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}
function routeSemver(u, res, json) {
  const q = u.searchParams;
  const mode = (q.get('mode') || 'compare').toLowerCase();
  if (mode === 'validate') {
    const v = q.get('v');
    if (!v) return json(res, 400, { error: 'v required' });
    const p = parseSemver(v);
    return json(res, 200, { version: v, valid: !!p, parsed: p });
  }
  if (mode === 'compare') {
    const a = q.get('a'), b = q.get('b');
    if (!a || !b) return json(res, 400, { error: 'a and b required' });
    const pa = parseSemver(a), pb = parseSemver(b);
    if (!pa) return json(res, 400, { error: `invalid semver: ${a}` });
    if (!pb) return json(res, 400, { error: `invalid semver: ${b}` });
    const c = cmpSemver(pa, pb);
    return json(res, 200, {
      a, b, comparison: c === 0 ? 'equal' : c < 0 ? 'a < b' : 'a > b',
      newer: c === 0 ? null : c < 0 ? b : a,
      result: c === 0 ? '=' : c < 0 ? '<' : '>'
    });
  }
  if (mode === 'diff') {
    const a = q.get('a'), b = q.get('b');
    if (!a || !b) return json(res, 400, { error: 'a and b required' });
    const pa = parseSemver(a), pb = parseSemver(b);
    if (!pa || !pb) return json(res, 400, { error: 'invalid semver' });
    const changes = [];
    if (pa.major !== pb.major) changes.push(`major: ${pa.major} -> ${pb.major}`);
    if (pa.minor !== pb.minor) changes.push(`minor: ${pa.minor} -> ${pb.minor}`);
    if (pa.patch !== pb.patch) changes.push(`patch: ${pa.patch} -> ${pb.patch}`);
    const level = pa.major !== pb.major ? 'major' : pa.minor !== pb.minor ? 'minor' : pa.patch !== pb.patch ? 'patch' : 'none';
    return json(res, 200, { a, b, level, changes });
  }
  if (mode === 'satisfies') {
    const v = q.get('v'), range = q.get('range');
    if (!v || !range) return json(res, 400, { error: 'v and range required' });
    const p = parseSemver(v);
    if (!p) return json(res, 400, { error: `invalid semver: ${v}` });
    // simple ranges: ^x.y.z ~x.y.z >x.y.z <x.y.z >=x.y.z <=x.y.z x.y.z * x
    let ok = false;
    try {
      for (const part of range.split(/\s*\|\|\s*/)) {
        if (semverRangeMatch(part.trim(), p)) { ok = true; break; }
      }
    } catch (e) { return json(res, 400, { error: 'unsupported range: ' + e.message }); }
    return json(res, 200, { version: v, range, satisfies: ok });
  }
  return json(res, 400, { error: 'mode must be validate|compare|diff|satisfies' });
}
function semverRangeMatch(range, p) {
  if (range === '*' || range === '') return true;
  const c = range.match(/^(>=|<=|>|<|=)\s*(.+)$/);
  if (!c) {
    var m = range.match(/^[\^~]?(0|[1-9]\d*)(?:\.(0|[1-9]\d*))?(?:\.(0|[1-9]\d*))?/);
    if (!m) throw new Error('bad range: ' + range);
  }
  const op = range[0] === '^' ? '^' : range[0] === '~' ? '~' : '';
  const maj = c ? null : +m[1], min = c ? null : (m[2] !== undefined ? +m[2] : null), pat = c ? null : (m[3] !== undefined ? +m[3] : null);
  if (c) {
    const op2 = c[1], target = parseSemver(c[2]);
    if (!target) throw new Error('bad version in range');
    const d = cmpSemver(p, target);
    switch (op2) {
      case '>=': if (d < 0) return false; break;
      case '<=': if (d > 0) return false; break;
      case '>': if (d <= 0) return false; break;
      case '<': if (d >= 0) return false; break;
      case '=': if (d !== 0) return false; break;
    }
    return true;
  }
  if (op === '^') {
    if (p.major !== maj) return false;
    if (maj > 0) return cmpSemver(p, { major: maj, minor: min || 0, patch: pat || 0, prerelease: null }) >= 0;
    return p.minor === (min || 0) && cmpSemver(p, { major: 0, minor: min || 0, patch: pat || 0, prerelease: null }) >= 0;
  }
  if (op === '~') {
    if (p.major !== maj || p.minor !== (min || 0)) return false;
    return cmpSemver(p, { major: maj, minor: min || 0, patch: pat || 0, prerelease: null }) >= 0;
  }
  // exact or partial
  if (p.major !== maj) return false;
  if (min !== null && p.minor !== min) return false;
  if (pat !== null && p.patch !== pat) return false;
  return true;
}
module.exports = { routeSemver };
