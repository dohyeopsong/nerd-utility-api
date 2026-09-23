// /semver — parse, compare, sort, and range-check semantic versions (semver.org)
function parse(v) {
  const m = v.trim().match(/^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/);
  if (!m) return null;
  return { major: +m[1], minor: +m[2], patch: +m[3], prerelease: m[4] || null, raw: v.trim() };
}
function cmp(a, b) {
  for (const k of ['major', 'minor', 'patch']) {
    if (a[k] !== b[k]) return a[k] < b[k] ? -1 : 1;
  }
  const pa = (a.prerelease || '').split('.').filter(Boolean);
  const pb = (b.prerelease || '').split('.').filter(Boolean);
  if (!pa.length && !pb.length) return 0;
  if (!pa.length) return 1;               // release > prerelease
  if (!pb.length) return -1;
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i], y = pb[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const nx = /^\d+$/.test(x), ny = /^\d+$/.test(y);
    if (nx && ny) { if (+x !== +y) return +x < +y ? -1 : 1; }
    else if (nx) return -1;
    else if (ny) return 1;
    else if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}
function satisfies(v, range) {
  const alts = range.split(/\s*\|\|\s*/).filter(Boolean);
  if (!alts.length) return false;
  for (const alt of alts) {
    const hm = alt.match(/^\s*(v?\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?)\s+-\s+(v?\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?)\s*$/);
    let ok = true;
    if (hm) { ok = cmp(v, parse(hm[1])) >= 0 && cmp(v, parse(hm[2])) <= 0; }
    else {
      const comps = alt.trim().split(/\s+/).filter(Boolean);
      ok = comps.length > 0;
      for (const c of comps) {
        const m = c.match(/^(\^|~|>=|<=|>|<|=)?(v?\d+(?:\.\d+){0,2})(?:\.(\*|x))?(-[0-9A-Za-z.-]+)?$/);
        if (!m) { ok = false; break; }
        const [full, op, ver, , pre] = m;
        const parts = ver.replace(/^v/, '').split('.').map(Number);
        if (op === '^') {
          const [ma, mi = 0, pa = 0] = parts;
          const lo = parse(`v${ma}.${mi}.${pa}${pre || ''}`);
          let hi;
          if (ma > 0) hi = parse(`v${ma + 1}.0.0`);
          else if (mi > 0) hi = parse(`v0.${mi + 1}.0`);
          else hi = parse(`v0.0.${pa + 1}`);
          if (!(cmp(v, lo) >= 0 && cmp(v, hi) < 0)) { ok = false; break; }
        } else if (op === '~') {
          const [ma, mi = 0, pa = 0] = parts;
          const lo = parse(`v${ma}.${mi}.${pa}${pre || ''}`);
          const hi = parse(`v${ma}.${mi + 1}.0`);
          if (!(cmp(v, lo) >= 0 && cmp(v, hi) < 0)) { ok = false; break; }
        } else {
          const target = parse(ver.replace(/^v/, '') + '.0'.repeat(3 - parts.length));
          if (!target) { ok = false; break; }
          if (parts.length < 3) {
            const [ma, mi] = parts;
            let lo, hi;
            if (parts.length === 1) { lo = parse(`v${ma}.0.0`); hi = parse(`v${ma + 1}.0.0`); }
            else { lo = parse(`v${ma}.${mi}.0`); hi = parse(`v${ma}.${mi + 1}.0`); }
            if (!(cmp(v, lo) >= 0 && cmp(v, hi) < 0)) { ok = false; break; }
          } else {
            const c = cmp(v, target);
            const need = op === '<' ? c < 0 : op === '<=' ? c <= 0 : op === '>=' ? c >= 0 : op === '>' ? c > 0 : c === 0;
            if (!need) { ok = false; break; }
          }
        }
      }
    }
    if (ok) return true;
  }
  return false;
}
function routeSemver(u, res, json) {
  const p = u.searchParams;
  const a = p.get('a') || p.get('version');
  const b = p.get('b');
  const range = p.get('range');
  const list = p.get('list');
  if (list) {
    const vs = list.split(',').map(s => s.trim());
    const parsed = vs.map(parse);
    if (parsed.some(x => !x)) return json(res, 400, { error: 'invalid semver in list' });
    const sorted = parsed.slice().sort(cmp);
    return json(res, 200, { input: vs, sorted: sorted.map(v => v.raw), latest: sorted[sorted.length - 1].raw, oldest: sorted[0].raw });
  }
  if (!a) return json(res, 200, { usage: '?a=1.2.3[&b=2.0.0 compare][&range=^1.0.0 range check][&list=1.0.0,2.0.0 sort]' });
  const pa = parse(a);
  if (!pa) return json(res, 400, { error: 'invalid semver: ' + a });
  const out = { version: a, major: pa.major, minor: pa.minor, patch: pa.patch, prerelease: pa.prerelease };
  if (b) {
    const pb = parse(b);
    if (!pb) return json(res, 400, { error: 'invalid semver: ' + b });
    const c = cmp(pa, pb);
    out.compare = c === 0 ? 'equal' : c < 0 ? 'less' : 'greater';
    out.result = c < 0 ? `${a} < ${b}` : c > 0 ? `${a} > ${b}` : `${a} == ${b}`;
  }
  if (range) {
    out.range = range;
    out.satisfies = satisfies(pa, range);
  }
  return json(res, 200, out);
}
module.exports = { routeSemver };
