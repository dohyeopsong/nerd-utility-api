// /leetspeak — text to leetspeak converter
const MAP = { a:'4', A:'4', e:'3', E:'3', i:'1', I:'1', o:'0', O:'0', s:'5', S:'5', t:'7', T:'7', b:'8', B:'8', g:'9', G:'9', l:'1', L:'1' };
function routeLeet(u, res, json) {
  const p = u.searchParams;
  const text = p.get('text');
  if (!text) return json(res, 200, { usage: '?text=hello world — basic leet conversion', mappings: MAP });
  let result = '';
  for (const ch of text) result += MAP[ch] !== undefined ? MAP[ch] : ch;
  return json(res, 200, { result, input: text });
}
module.exports = { routeLeet };
