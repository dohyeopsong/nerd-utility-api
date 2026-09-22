// /semver — parse, compare, and range-check semantic versions
function parseSemver(v) {
  const m = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:\d*[a-zA-Z-][\da-zA-Z-]*|0|[1-9]\d*)(?:\.(?:\d*[a-zA-Z-][\da-zA-Z-]*|0|[1-9]\d*))*))?(?:\+([\da-zA-Z-]+(?:\.[\da-zA-Z-]+)*))?$/.exec(v.trim());
  if (!m) throw new Error(`invalid semver: ${v}`);
  return { major: +m[1], minor: +m[2], patch: +m[3], prerelease: m[4] || null, build: m[5] || null };
}
function cmpPre(a, b) {
  // SemVer precedence: version without prerelease > with; identifiers compared per spec
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  const A = a.split('.'), B = b.split('.');
  for (let i = 0; i < Math.max(A.length, B.length); i++) {
    const x = A[i], y = B[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const xn = /^\d+$/.test(x), yn = /^\d+$/.test(y);
    if (xn && yn) { if (+x !== +y) return +x < +y ? -1 : 1; }
    else if (xn) return -1;      // numeric < alphanumeric
    else if (yn) return 1;
    else if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}
function compare(a, b) {
  const va = parseSemver(a), vb = parseSemver(b);
  for (const k of ['major', 'minor', 'patch']) {
    if (va[k] !== vb[k]) return va[k] < vb[k] ? -1 : 1;
  }
  return cmpPre(va.prerelease, vb.prerelease);
}
function satisfiesRange(v, range) {
  const va = parseSemver(v);
  const isPrerelease = !!va.prerelease;
  return range.split('||').some(disj =>
    disj.trim().split(/\s+/).every(c => {
      c = c.trim();
      if (!c) return true;
      // strip range prerelease (e.g. >=1.2.3-alpha)
      let m = /^(>=|<=|>|<|=|\^|~)?\s*(.+)$/.exec(c);
      let op = m[1] || '=';
      let target = m[2];
      // caret/tilde
      const parts = target.split('.');
      const hasMinor = parts.length > 1 && parts[1] !== 'x' && parts[1] !== '*';
      const hasPatch = parts.length > 2 && parts[2] !== 'x' && parts[2] !== '*';
      if (op === '^' || op === '~') {
        const base = parseSemver(`${parts[0]}.${hasMinor ? parts[1] : '0'}.${hasPatch ? parts[2] : '0'}`);
        if (compare(v, target.replace(/x|\*/g, '0')) < 0) return false;
        let upper;
        if (op === '^') {
          if (base.major > 0) upper = `${base.major + 1}.0.0`;
          else if (base.minor > 0) upper = `0.${base.minor + 1}.0`;
          else upper = `0.0.${base.patch + 1}`;
        } else {
          upper = `${base.major}.${base.minor + 1}.0`;
        }
        return compare(v, upper) < 0;
      }
      // wildcards: 1.2.x / 1.x
      if (!hasMinor) { if (+parts[0] !== va.major) return false; op = 'range-ok'; }
      else if (!hasPatch) {
        if (+parts[0] !== va.major || +parts[1] !== va.minor) return false; op = 'range-ok';
      }
      const c2 = compare(v, target.replace(/x|\*/g, '0'));
      switch (op) {
        case '=': case 'range-ok': return true;
        case '>': return c2 > 0;
        case '<': return c2 < 0;
        case '>=': return c2 >= 0;
        case '<=': return c2 <= 0;
      }
      return false;
    })
  );
}
function routeSemver(u, res, json) {
  const q = u.searchParams;
  const mode = (q.get('mode') || 'compare').toLowerCase();
  if (mode === 'compare') {
    const a = q.get('a'), b = q.get('b');
    if (!a || !b) return json(res, 400, { error: 'a and b required' });
    let va, vb;
    try { va = parseSemver(a); vb = parseSemver(b); }
    catch (e) { return json(res, 400, { error: e.message }); }
    const c = compare(a, b);
    return json(res, 200, { a: va, b: vb, result: c < 0 ? 'a < b' : c > 0 ? 'a > b' : 'a == b', difference: c });
  }
  if (mode === 'sort') {
    const vs = (q.get('versions') || '').split(',').map(s => s.trim()).filter(Boolean);
    if (!vs.length) return json(res, 400, { error: 'versions required (comma-separated)' });
    try { vs.forEach(parseSemver); } catch (e) { return json(res, 400, { error: e.message }); }
    return json(res, 200, { sorted: vs.sort(compare), latest: vs[vs.length - 1], oldest: vs[0] });
  }
  if (mode === 'satisfies') {
    const v = q.get('v'), range = q.get('range');
    if (!v || !range) return json(res, 400, { error: 'v and range required' });
    let ok;
    try { ok = satisfiesRange(v, range); } catch (e) { return json(res, 400, { error: e.message }); }
    return json(res, 200, { version: v, range, satisfies: ok });
  }
  return json(res, 400, { error: 'mode must be compare|sort|satisfies' });
}
module.exports = { routeSemver };
