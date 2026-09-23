// /braille — text <-> Braille Unicode translation
const MAP = {
  'a':'⠁','b':'⠃','c':'⠉','d':'⠙','e':'⠑','f':'⠋','g':'⠛','h':'⠓','i':'⠊','j':'⠚',
  'k':'⠅','l':'⠇','m':'⠍','n':'⠝','o':'⠕','p':'⠏','q':'⠟','r':'⠗','s':'⠎','t':'⠞',
  'u':'⠥','v':'⠧','w':'⠺','x':'⠭','y':'⠽','z':'⠵',
  '1':'⠁','2':'⠃','3':'⠉','4':'⠙','5':'⠑','6':'⠋','7':'⠛','8':'⠓','9':'⠊','0':'⠚',
  ' ':' ',',':'⠲','.':'⠲',';':'⠰',':':'⠰','!':'⠖','?':'⠦','(':')':'⠶',
  "'":'⠄','-':'⠤','/':'⠌','@':'⠈','#':'⠼','*':'⠔',
};
const REV = {}; for (const [k, v] of Object.entries(MAP)) if (!REV[v]) REV[v] = k;

function routeBraille(u, res, json) {
  const p = u.searchParams;
  const text = p.get('text') || p.get('encode');
  const braille = p.get('decode');
  if (!text && !braille) return json(res, 200, { usage: '?text=hello or ?decode=⠓⠑⠇⠇⠕' });
  if (braille) {
    let out = '', skipped = 0;
    for (const ch of braille) {
      if (ch === ' ') { out += ' '; continue; }
      if (REV[ch]) out += REV[ch]; else skipped++;
    }
    return json(res, 200, { decoded: out, skipped });
  }
  let out = '', skipped = 0;
  for (const ch of text.toLowerCase()) {
    if (ch === ' ') { out += ' '; continue; }
    if (MAP[ch]) out += MAP[ch]; else skipped++;
  }
  return json(res, 200, { encoded: out, skipped, original: text });
}
module.exports = { routeBraille };
