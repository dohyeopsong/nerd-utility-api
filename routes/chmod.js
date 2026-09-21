// chmod calculator: octal <-> symbolic, with descriptions
const SYM = ['r','w','x'];
function octalToSymbolic(octal) {
  const o = String(octal).replace(/\D/g,'');
  if (!/^[0-7]{3,4}$/.test(o)) throw new Error('invalid octal: expected 3-4 digits 0-7');
  const s = o.slice(-3);
  const part = n => SYM.map((c,i) => (n >> (2-i)) & 1 ? c : '-').join('');
  return (o.length === 4 ? part(+o[0]) : '') + part(+s[0]) + part(+s[1]) + part(+s[2]);
}
function symbolicToOctal(sym) {
  const s = String(sym).trim();
  if (!/^[rwx-]{9}$/.test(s) && !/^[rwx-]{12}$/.test(s) && !/^[rwx-]{3}$/.test(s)) throw new Error('invalid symbolic: expected rwx- sequences');
  const part = p => SYM.reduce((acc,c,i) => acc + (p[i] === c ? (4 >> i) : 0), 0);
  const chunks = s.match(/[rwx-]{3}/g);
  return chunks.map(part).join('');
}
function describe(octal) {
  const o = String(octal).slice(-3);
  const who = ['owner','group','others'];
  return o.split('').map((d,i) => `${who[i]}: ${[+d&4?'read ':''][0]||''}${+d&2?'write ':''}${+d&1?'execute':''}`.trim()).join('; ');
}
function routeChmod(u, res, json) {
  const q = Object.fromEntries(new URL(u, 'http://x').searchParams);
  const input = q.value || q.number;
  if (!input) return json(res, 400, { error: 'provide ?value=<755 or rwxr-xr-x>' });
  try {
    if (/^[0-7]{3,4}$/.test(String(input).replace(/\D/g,'')) && !/[rwx-]/.test(input)) {
      const sym = octalToSymbolic(input);
      return json(res, 200, { input, octal: String(input), symbolic: sym, description: describe(input) });
    }
    const oct = symbolicToOctal(input);
    return json(res, 200, { input, octal: oct, symbolic: octalToSymbolic(oct), description: describe(oct) });
  } catch (e) { return json(res, 400, { error: e.message }); }
}
module.exports = { routeChmod, octalToSymbolic, symbolicToOctal };
