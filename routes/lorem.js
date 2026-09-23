// /lorem — generate lorem ipsum placeholder text
const WORDS = ['lorem','ipsum','dolor','sit','amet','consectetur','adipiscing','elit','sed','do','eiusmod','tempor','incididunt','ut','labore','et','dolore','magna','aliqua','enim','ad','minim','veniam','quis','nostrud','exercitation','ullamco','laboris','nisi','aliquip','ex','ea','commodo','consequat','duis','aute','irure','in','reprehenderit','voluptate','velit','esse','cillum','eu','fugiat','nulla','pariatur','excepteur','sint','occaecat','cupidatat','non','proident','sunt','culpa','qui','officia','deserunt','mollit','anim','id','est','laborum'];
function ri(n) { return Math.floor(Math.random() * n); }
function word() { return WORDS[ri(WORDS.length)]; }
function sentence() {
  const n = 6 + ri(10); const w = [];
  for (let i = 0; i < n; i++) w.push(word());
  const s = w.join(' ');
  return s.charAt(0).toUpperCase() + s.slice(1) + '.';
}
function paragraph() { return Array.from({ length: 3 + ri(3) }, sentence).join(' '); }
function routeLorem(u, res, json) {
  const q = Object.fromEntries(u.searchParams.entries());
  const count = Math.min(parseInt(q.count || q.n || '1', 10) || 1, 100);
  const mode = q.mode || 'paragraphs';
  let text, count_field = 'paragraphs';
  if (mode === 'words') {
    text = Array.from({ length: Math.min(count, 1000) }, word).join(' '); count_field = 'words';
  } else if (mode === 'sentences') {
    text = Array.from({ length: count }, sentence).join(' '); count_field = 'sentences';
  } else if (mode === 'lists') {
    text = Array.from({ length: count }, () => `  - ${sentence()}`).join('\n'); count_field = 'list items';
  } else {
    text = Array.from({ length: count }, paragraph).join('\n\n');
  }
  if (q.start !== '0' && mode === 'paragraphs' && count >= 1) {
    text = 'Lorem ipsum dolor sit amet, ' + text.charAt(0).toLowerCase() + text.slice(1);
  }
  if (q.raw) { res.writeHead(200, {'Content-Type':'text/plain; charset=utf-8'}); return res.end(text); }
  return json(res, 200, { text, count, mode, words: text.split(/\s+/).length });
}
module.exports = { routeLorem };
