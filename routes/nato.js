// /nato — NATO phonetic alphabet encode/decode
const MAP = {
  A:'Alfa',B:'Bravo',C:'Charlie',D:'Delta',E:'Echo',F:'Foxtrot',G:'Golf',H:'Hotel',
  I:'India',J:'Juliett',K:'Kilo',L:'Lima',M:'Mike',N:'November',O:'Oscar',P:'Papa',
  Q:'Quebec',R:'Romeo',S:'Sierra',T:'Tango',U:'Uniform',V:'Victor',W:'Whiskey',
  X:'X-ray',Y:'Yankee',Z:'Zulu',
  '0':'Zero','1':'One','2':'Two','3':'Three','4':'Four','5':'Five','6':'Six','7':'Seven','8':'Eight','9':'Nine'
};
const REVERSE = Object.fromEntries(Object.entries(MAP).map(([k,v]) => [v.toUpperCase(), k]));

function routeNato(u, res, json, body, isPost) {
  const q = u.searchParams.get('q');
  const mode = u.searchParams.get('mode') || 'encode'; // encode | decode
  if (!isPost && !q) {
    return json(res, 200, {
      op: 'nato',
      description: 'NATO phonetic alphabet conversion.',
      usage: '/nato?q=hello (encode) or /nato?q=Hotel Echo Lima Lima Oscar&mode=decode',
    });
  }
  if (!q) return json(res, 400, { error: 'Provide ?q=' });
  const s = String(q).trim();
  if (mode === 'decode') {
    const out = s.split(/[\s,]+/).filter(Boolean).map(w => {
      const k = w.toUpperCase();
      if (k in REVERSE) return REVERSE[k];
      throw new Error(`Unknown word: ${w}`);
    }).join('');
    return json(res, 200, { input: s, decoded: out });
  }
  const out = [...s.toUpperCase()].map(c => MAP[c] ?? null);
  const unknown = out.filter(x => x === null).length;
  return json(res, 200, {
    input: s,
    encoded: out.filter(x => x !== null).join(' '),
    skipped_unknown: unknown,
  });
}

module.exports = { routeNato };
