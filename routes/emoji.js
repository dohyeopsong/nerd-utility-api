// /emoji — emoji lookup (name -> emoji, emoji -> name, keyword search)
const EMOJI = {
  'grinning face': '😀', 'grinning face with big eyes': '😃', 'grinning face with smiling eyes': '😄',
  'beaming face with smiling eyes': '😁', 'grinning squinting face': '😆', 'winking face': '😉',
  'smiling face with smiling eyes': '😊', 'smiling face with heart-eyes': '😍',
  'face blowing a kiss': '😘', 'face savoring food': '😋', 'zany face': '🤪',
  'thinking face': '🤔', 'face with raised eyebrow': '🤨', 'neutral face': '😐',
  'expressionless face': '😑', 'smiling face with horns': '😈',
  'skull': '💀', 'ghost': '👻', 'alien': '👽', 'robot': '🤖',
  'thumbs up': '👍', 'thumbs down': '👎', 'ok hand': '👌', 'victory hand': '✌️',
  'waving hand': '👋', 'raised hand': '✋', 'clapping hands': '👏',
  'red heart': '❤️', 'orange heart': '🧡', 'yellow heart': '💛', 'green heart': '💚',
  'blue heart': '💙', 'purple heart': '💜', 'black heart': '🖤', 'broken heart': '💔',
  'fire': '🔥', 'sparkles': '✨', 'star': '⭐', 'rocket': '🚀', 'party popper': '🎉',
  'trophy': '🏆', 'medal': '🏅', 'crown': '👑', 'gem': '💎', 'money bag': '💰',
  'chart increasing': '📈', 'chart decreasing': '📉', 'money with wings': '💸',
  'check mark button': '✅', 'cross mark button': '❌', 'warning': '⚠️',
  'light bulb': '💡', 'books': '📚', 'pencil': '✏️', 'memo': '📝',
  'sun': '☀️', 'moon': '🌙', 'cloud': '☁️', 'rainbow': '🌈', 'snowflake': '❄️',
  'coffee': '☕', 'pizza': '🍕', 'hamburger': '🍔', 'cake': '🍰', 'beer': '🍺',
  'dog': '🐕', 'cat': '🐈', 'fox': '🦊', 'bear': '🐻', 'panda': '🐼',
  'computer': '💻', 'phone': '📱', 'keyboard': '⌨️', 'floppy disk': '💾',
  'eyes': '👀', 'ear': '👂', 'nose': '👃', 'mouth': '👄', 'brain': '🧠',
  'flexed biceps': '💪', 'prayer hands': '🙏', 'folded hands': '🙏',
  'wastebasket': '🗑️', 'lock': '🔒', 'key': '🔑', 'mag': '🔍', 'bell': '🔔',
};
// reverse map (first name wins for duplicate emoji)
const REVERSE = {};
for (const [name, e] of Object.entries(EMOJI)) {
  if (!REVERSE[e]) REVERSE[e] = name;
}

function routeEmoji(u, res, json) {
  const p = u.searchParams;
  const q = (p.get('q') || p.get('name') || p.get('emoji') || '').trim().toLowerCase();
  if (!q) return json(res, 400, { error: 'provide ?name=fire, ?emoji=🔥, or ?list=1' });
  if (p.get('list')) return json(res, 200, { count: Object.keys(EMOJI).length, names: Object.keys(EMOJI) });
  // direct emoji lookup (exact char match)
  if (REVERSE[q]) return json(res, 200, { emoji: q, name: REVERSE[q] });
  // exact name match
  if (EMOJI[q]) return json(res, 200, { name: q, emoji: EMOJI[q] });
  // keyword search
  const matches = Object.entries(EMOJI)
    .filter(([name]) => name.includes(q))
    .slice(0, 20)
    .map(([name, emoji]) => ({ name, emoji }));
  if (matches.length) return json(res, 200, { query: q, matches, total: matches.length });
  return json(res, 404, { error: 'no emoji found', query: q });
}

module.exports = { routeEmoji };
