// Lorem ipsum generator: words, sentences, paragraphs
const WORDS = ['lorem','ipsum','dolor','sit','amet','consectetur','adipiscing','elit','sed','do','eiusmod','tempor','incididunt','ut','labore','et','dolore','magna','aliqua','enim','ad','minim','veniam','quis','nostrud','exercitation','ullamco','laboris','nisi','aliquip','ex','ea','commodo','consequat','duis','aute','irure','in','reprehenderit','voluptate','velit','esse','cillum','eu','fugiat','nulla','pariatur','excepteur','sint','occaecat','cupidatat','non','proident','sunt','culpa','qui','officia','deserunt','mollit','anim','id','est','laborum'];
const rand = n => Math.floor(Math.random() * n);
function sentence() {
  const len = 6 + rand(10);
  const w = Array.from({length: len}, () => WORDS[rand(WORDS.length)]);
  const s = w.join(' ');
  return s[0].toUpperCase() + s.slice(1) + '.';
}
function paragraph() {
  const len = 3 + rand(4);
  return Array.from({length: len}, sentence).join(' ');
}
function routeLorem(u, res, json) {
  const q = Object.fromEntries(new URL(u, 'http://x').searchParams);
  const type = (q.type || 'paragraphs').toLowerCase();
  const count = Math.min(Math.max(parseInt(q.count || '3', 10) || 3, 1), 100);
  let out;
  if (type === 'words') out = Array.from({length: Math.min(count*1, 1000)}, () => WORDS[rand(WORDS.length)]).slice(0, count).join(' ');
  else if (type === 'sentences') out = Array.from({length: count}, sentence).join(' ');
  else if (type === 'paragraphs') out = Array.from({length: count}, paragraph).join('\n\n');
  else return json(res, 400, { error: 'type must be words|sentences|paragraphs' });
  if (q.format === 'text') { res.writeHead(200, {'Content-Type':'text/plain'}); return res.end(out); }
  return json(res, 200, { type, count, text: out });
}
module.exports = { routeLorem };
