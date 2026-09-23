// /lorem — lorem ipsum placeholder text generator
const WORDS = ('lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum').split(' ');

function rnd(n) { return Math.floor(Math.random() * n); }
function sentence() {
  const len = 6 + rnd(10);
  const ws = [];
  for (let i = 0; i < len; i++) ws.push(WORDS[rnd(WORDS.length)]);
  const s = ws.join(' ');
  return s[0].toUpperCase() + s.slice(1) + '.';
}
function paragraph() {
  const n = 3 + rnd(4);
  return Array.from({ length: n }, sentence).join(' ');
}

function routeLorem(u, res, json, body, isPost) {
  const count = parseInt(u.searchParams.get('count') || '1', 10);
  const type = u.searchParams.get('type') || 'paragraphs'; // paragraphs | sentences | words
  if (!isPost && !u.searchParams.get('count') && !u.searchParams.get('type') && !body) {
    return json(res, 200, {
      op: 'lorem',
      description: 'Generate lorem ipsum placeholder text.',
      usage: '/lorem?count=3&type=paragraphs (or sentences, words)',
      example: '/lorem?count=2&type=sentences',
    });
  }
  if (!(count >= 1 && count <= 500)) return json(res, 400, { error: 'count must be 1-500' });
  let result;
  if (type === 'sentences') result = Array.from({ length: count }, sentence);
  else if (type === 'words') result = Array.from({ length: count }, () => WORDS[rnd(WORDS.length)]).join(' ');
  else result = Array.from({ length: count }, paragraph);
  return json(res, 200, { type, count, text: type === 'words' ? result : result.join('\n\n') });
}

module.exports = { routeLorem };
