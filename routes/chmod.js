// Unix file permission converter: symbolic <-> numeric (e.g. rwxr-x--- <-> 750)
function symbolicToNumeric(sym) {
  const s = String(sym).trim();
  if (!/^[rwxstST-]{9}$/.test(s)) throw new Error('symbolic must be 9 chars of rwxstST- (e.g. rwxr-x---)');
  let u = 0, g = 0, o = 0;
  const val = (triplet) => (triplet[0] === 'r' ? 4 : 0) + (triplet[1] === 'w' ? 2 : 0) + ('xst'.includes(triplet[2]) ? 1 : 0);
  const trip = [s.slice(0,3), s.slice(3,6), s.slice(6,9)];
  u = val(trip[0]); g = val(trip[1]); o = val(trip[2]);
  // special bits: setuid (u+s -> 's' replaces x in owner triplet), setgid, sticky
  let special = 0;
  if (trip[0][2] === 's') special += 4;
  if (trip[1][2] === 's') special += 2;
  if (trip[2][2] === 't') special += 1;
  return { special, octal: String(special) + String(u) + String(g) + String(o), u, g, o };
}
function numericToSymbolic(numStr) {
  const s = String(numStr).trim();
  if (!/^[0-7]{3,4}$/.test(s)) throw new Error('numeric must be 3-4 octal digits (e.g. 750 or 4750)');
  const padded = s.length === 3 ? '0' + s : s;
  const special = +padded[0], u = +padded[1], g = +padded[2], o = +padded[3];
  const trip = (v, specialChar) => {
    let t = (v & 4 ? 'r' : '-') + (v & 2 ? 'w' : '-');
    if (specialChar) t += (v & 1) ? specialChar.toLowerCase() : specialChar.toUpperCase();
    else t += (v & 1) ? 'x' : '-';
    return t;
  };
  let symbolic = trip(u, special & 4 ? 's' : null) + trip(g, special & 2 ? 's' : null) + trip(o, special & 1 ? 't' : null);
  // uppercase special chars mean bit set without execute
  return symbolic;
}
function explain(padded) {
  const special = +padded[0], u = +padded[1], g = +padded[2], o = +padded[3];
  const who = ['owner','group','other'];
  const names = { 0:'none', 1:'execute', 2:'write', 3:'write+execute', 4:'read', 5:'read+execute', 6:'read+write', 7:'read+write+execute' };
  const out = { special: {} };
  if (special & 4) out.special.setuid = 'runs as file owner';
  if (special & 2) out.special.setgid = 'runs as file group / inherits dir group';
  if (special & 1) out.special.sticky = 'only owner can delete files in dir';
  [u, g, o].forEach((v, i) => out[who[i]] = names[v]);
  return out;
}
function routeChmod(u, res, json) {
  const q = Object.fromEntries(new URL(u, 'http://x').searchParams);
  try {
    if (q.sym) {
      const { special, octal, u: uu, g: gg, o: oo } = symbolicToNumeric(q.sym);
      const padded = String(special) + uu + gg + oo;
      return json(res, 200, { input: q.sym, numeric: octal, symbolic: numericToSymbolic(padded), explanation: explain(padded) });
    }
    if (q.num) {
      const padded = q.num.length === 3 ? '0' + q.num : q.num;
      return json(res, 200, { input: q.num, numeric: padded, symbolic: numericToSymbolic(q.num), explanation: explain(padded) });
    }
    return json(res, 400, { error: 'provide ?sym=rwxr-x--- or ?num=750' });
  } catch (e) { return json(res, 400, { error: e.message }); }
}
module.exports = { routeChmod, symbolicToNumeric, numericToSymbolic };
