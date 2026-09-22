// /chmod — convert file permissions between octal (644) and symbolic (rw-r--r--)
const SYM = ['r', 'w', 'x'];
function routeChmod(u, res, json) {
  const q = u.searchParams;
  const perm = (q.get('perm') || q.get('mode') || '').trim();
  if (!perm) return json(res, 400, { error: 'perm required (e.g. 644 or rw-r--r--)' });
  // Octal input: 644, 0644, 4755 (setuid/setgid/sticky)
  if (/^0?[0-7]{3,4}$/.test(perm)) {
    const s = perm.replace(/^0(?=\d{3}$)/, '');
    let special = null;
    let octal = s;
    if (s.length === 4) { special = +s[0]; octal = s.slice(1); }
    const parts = octal.split('').map(d => +d);
    const symbolic = parts.map(p => ((p & 4 ? 'r' : '-') + (p & 2 ? 'w' : '-') + (p & 1 ? 'x' : '-'))).join('');
    const [u9, g9, o9] = parts;
    const out = {
      octal: s.length === 4 ? s : '0' + s,
      symbolic,
      owner: { read: !!(u9 & 4), write: !!(u9 & 2), execute: !!(u9 & 1) },
      group: { read: !!(g9 & 4), write: !!(g9 & 2), execute: !!(g9 & 1) },
      others: { read: !!(o9 & 4), write: !!(o9 & 2), execute: !!(o9 & 1) }
    };
    if (special !== null) {
      out.special_bits = {
        setuid: !!(special & 4), setgid: !!(special & 2), sticky: !!(special & 1)
      };
      // reflect in symbolic: s/S, s/S, t/T
      let sym = symbolic.split('');
      if (special & 4) sym[2] = (u9 & 1) ? 's' : 'S';
      if (special & 2) sym[5] = (g9 & 1) ? 's' : 'S';
      if (special & 1) sym[8] = (o9 & 1) ? 't' : 'T';
      out.symbolic_full = sym.join('');
    }
    return json(res, 200, out);
  }
  // Symbolic input: rwxr-xr-x or rwsr-xr-t
  if (/^[rwsxStT-]{9}$/.test(perm)) {
    let special = 0;
    let clean = perm.split('');
    const mapLower = { s: 'x', t: 'x' };
    ['u', 'g', 'o'].forEach((_, gi) => {
      const xc = clean[gi * 3 + 2];
      if (xc === 's') { special |= (4 >> 0) && 0; special |= 4 / Math.pow(2, gi); clean[gi * 3 + 2] = 'x'; }
      if (xc === 'S') { special |= 4 / Math.pow(2, gi); clean[gi * 3 + 2] = '-'; }
      if (xc === 't' && gi === 2) { special |= 1; clean[8] = 'x'; }
      if (xc === 'T' && gi === 2) { special |= 1; clean[8] = '-'; }
    });
    const oct = [0, 1, 2].map(gi => {
      const seg = clean.slice(gi * 3, gi * 3 + 3).join('');
      return (seg[0] !== '-' ? 4 : 0) | (seg[1] !== '-' ? 2 : 0) | (seg[2] !== '-' ? 1 : 0);
    });
    const octal = oct.join('');
    const out = {
      symbolic: perm,
      symbolic_normalized: clean.join(''),
      octal: special ? special + '' + octal : '0' + octal,
      owner: { read: perm[0] !== '-', write: perm[1] !== '-', execute: 'xst'.includes(perm[2]) },
      group: { read: perm[3] !== '-', write: perm[4] !== '-', execute: 'xst'.includes(perm[5]) },
      others: { read: perm[6] !== '-', write: perm[7] !== '-', execute: 'xst'.includes(perm[8]) }
    };
    if (special) out.special_bits = { setuid: !!(special & 4), setgid: !!(special & 2), sticky: !!(special & 1) };
    return json(res, 200, out);
  }
  return json(res, 400, { error: 'unrecognized permission format: ' + perm });
}
module.exports = { routeChmod };
