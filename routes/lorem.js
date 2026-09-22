// /lorem — placeholder text: words, sentences, paragraphs
const WORDS = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum'.split(' ');
const rnd = n => Math.floor(Math.random() * n);
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
function sentence() {
  const len = 6 + rnd(10);
  const w = Array.from({length: len}, () => WORDS[rnd(WORDS.length)]);
  return cap(w.join(' ')) + (rnd(10) < 8 ? '.' : '!');
}
function paragraph() {
  const n = 3 + rnd(4);
  return Array.from({length: n}, sentence).join(' ');
}
function routeLorem(u, res, json) {
  const q = Object.fromEntries(u.searchParams.entries());
  const type = (q.type || 'paragraphs').toLowerCase();
  const count = Math.min(Math.max(Number(q.count) || 1, 1), 100);
  let items, text;
  if (type === 'words') {
    const n = Math.min(Math.max(Number(q.count) || 10, 1), 1000);
    items = [WORDS.slice(0, n).join(' ')];
  } else if (type === 'sentences') {
    items = Array.from({length: count}, sentence);
  } else if (type === 'paragraphs') {
    items = Array.from({length: count}, paragraph);
  } else throw new Error('type must be words, sentences, or paragraphs');
  text = items.join(type === 'sentences' ? ' ' : '\n\n');
  if (q.start === '1' && type !== 'words') text = cap(text);
  if (q.format === 'text') { res.writeHead(200, {'Content-Type':'text/plain; charset=utf-8'}); return res.end(text); }
  return json(res, 200, { type, count: items.length, items, text });
}
module.exports = { routeLorem };
