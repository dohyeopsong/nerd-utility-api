// Unix chmod permission calculator: numeric <-> symbolic conversion, per-class breakdown
function routeChmod(u, res, json) {
  const q = Object.fromEntries(new URL(u, 'http://x').searchParams);
  const input = (q.mode || q.m || '').trim();
  if (!input) return json(res, 400, { error: 'provide ?mode=<numeric 0-7777 or symbolic like rw-r--r-- or u=rw,g=r,o=>' });
  const classes = { user: null, group: null, other: null };
  const bitsOf = (s) => {
    const R = s.includes('r') ? 4 : 0, W = s.includes('w') ? 2 : 0, X = s.includes('x') ? 1 : 0;
    if (/[^rwx-]/.test(s)) throw new Error(`invalid permission chars '${s}' (only rwx- allowed)`);
    return R + W + X;
  };
  const namesOf = (n, execName = 'x') => [
    n & 4 ? 'read' : null, n & 2 ? 'write' : null, n & 1 ? execName : null,
  ].filter(Boolean);
  try {
    if (/^[0-7]{3,4}$/.test(input)) {
      const octal = input.padStart(4, '0');
      const special = +octal[0], us = +octal[1], gr = +octal[2], ot = +octal[3];
      const sym = [us, gr, ot].map(n => `${n & 4 ? 'r' : '-'}${n & 2 ? 'w' : '-'}${n & 1 ? 'x' : '-'}`).join('');
      const specialSym = special ? `${special & 4 ? 's' : '-'}${special & 2 ? 's' : '-'}${special & 1 ? 't' : '-'}` : null;
      return json(res, 200, {
        input, numeric: +octal, symbolic: sym, octal,
        specialBits: {
          setuid: !!(special & 4), setgid: !!(special & 2), sticky: !!(special & 1),
        },
        breakdown: {
          user:  { octal: us, symbolic: sym.slice(0, 3),  permissions: namesOf(us) },
          group: { octal: gr, symbolic: sym.slice(3, 6),  permissions: namesOf(gr) },
          other: { octal: ot, symbolic: sym.slice(6, 9),  permissions: namesOf(ot) },
        },
      });
    }
    if (/^[rwx-]{9}$/.test(input)) {
      const us = bitsOf(input.slice(0, 3)), gr = bitsOf(input.slice(3, 6)), ot = bitsOf(input.slice(6, 9));
      const numeric = us * 64 + gr * 8 + ot;
      return json(res, 200, {
        input, numeric, octal: String(numeric).padStart(3, '0'), symbolic: input,
        specialBits: { setuid: false, setgid: false, sticky: false },
        breakdown: {
          user:  { octal: us, symbolic: input.slice(0, 3), permissions: namesOf(us) },
          group: { octal: gr, symbolic: input.slice(3, 6), permissions: namesOf(gr) },
          other: { octal: ot, symbolic: input.slice(6, 9), permissions: namesOf(ot) },
        },
      });
    }
    if (/^[ugoa]+[=+-][rwx]*([,][ugoa]*[=+-][rwx]*)*$/.test(input)) {
      // symbolic chmod like u=rw,g=r,o= — resolve against mode 0
      let mode = 0;
      for (const clause of input.split(',')) {
        const m = clause.match(/^([ugoa]*)([=+-])([rwx]*)$/);
        if (!m) throw new Error(`invalid clause '${clause}'`);
        const [, who, op, perms] = m;
        const targets = who.includes('a') || who === '' ? ['u', 'g', 'o'] : [...who];
        const val = (perms.includes('r') ? 4 : 0) + (perms.includes('w') ? 2 : 0) + (perms.includes('x') ? 1 : 0);
        for (const t of targets) {
          const shift = t === 'u' ? 6 : t === 'g' ? 3 : 0;
          if (op === '=') mode = (mode & ~(7 << shift)) | (val << shift);
          else if (op === '+') mode |= val << shift;
          else if (op === '-') mode &= ~(val << shift);
        }
      }
      const us = (mode >> 6) & 7, gr = (mode >> 3) & 7, ot = mode & 7;
      const sym = [us, gr, ot].map(n => `${n & 4 ? 'r' : '-'}${n & 2 ? 'w' : '-'}${n & 1 ? 'x' : '-'}`).join('');
      return json(res, 200, {
        input, numeric: mode, octal: String(mode).padStart(3, '0'), symbolic: sym,
        specialBits: { setuid: false, setgid: false, sticky: false },
        breakdown: {
          user:  { octal: us, symbolic: sym.slice(0, 3), permissions: namesOf(us) },
          group: { octal: gr, symbolic: sym.slice(3, 6), permissions: namesOf(gr) },
          other: { octal: ot, symbolic: sym.slice(6, 9), permissions: namesOf(ot) },
        },
      });
    }
    return json(res, 400, { error: 'unrecognized mode format — use numeric (755), full symbolic (rwxr-xr-x), or clause (u=rw,g=r,o=)' });
  } catch (e) {
    return json(res, 400, { error: e.message });
  }
}
module.exports = { routeChmod };
