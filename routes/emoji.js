// /emoji — emoji lookup by keyword, with unicode codepoints
const EMOJI = {
  smile: { char: '😄', name: 'grinning face with smiling eyes', cp: 'U+1F604' },
  grin: { char: '😁', name: 'beaming face with smiling eyes', cp: 'U+1F601' },
  joy: { char: '😂', name: 'face with tears of joy', cp: 'U+1F602' },
  laugh: { char: '🤣', name: 'rolling on the floor laughing', cp: 'U+1F923' },
  wink: { char: '😉', name: 'winking face', cp: 'U+1F609' },
  blush: { char: '😊', name: 'smiling face with smiling eyes', cp: 'U+1F60A' },
  heart: { char: '❤️', name: 'red heart', cp: 'U+2764 U+FE0F' },
  fire: { char: '🔥', name: 'fire', cp: 'U+1F525' },
  star: { char: '⭐', name: 'star', cp: 'U+2B50' },
  rocket: { char: '🚀', name: 'rocket', cp: 'U+1F680' },
  check: { char: '✅', name: 'check mark button', cp: 'U+2705' },
  cross: { char: '❌', name: 'cross mark', cp: 'U+274C' },
  warning: { char: '⚠️', name: 'warning sign', cp: 'U+26A0 U+FE0F' },
  thumbsup: { char: '👍', name: 'thumbs up', cp: 'U+1F44D' },
  thumbsdown: { char: '👎', name: 'thumbs down', cp: 'U+1F44E' },
  clap: { char: '👏', name: 'clapping hands', cp: 'U+1F44F' },
  pray: { char: '🙏', name: 'folded hands', cp: 'U+1F64F' },
  muscle: { char: '💪', name: 'flexed biceps', cp: 'U+1F4AA' },
  brain: { char: '🧠', name: 'brain', cp: 'U+1F9E0' },
  eyes: { char: '👀', name: 'eyes', cp: 'U+1F440' },
  thinking: { char: '🤔', name: 'thinking face', cp: 'U+1F914' },
  sunglasses: { char: '😎', name: 'smiling face with sunglasses', cp: 'U+1F60E' },
  cry: { char: '😢', name: 'crying face', cp: 'U+1F622' },
  scream: { char: '😱', name: 'face screaming in fear', cp: 'U+1F631' },
  skull: { char: '💀', name: 'skull', cp: 'U+1F480' },
  ghost: { char: '👻', name: 'ghost', cp: 'U+1F47B' },
  alien: { char: '👽', name: 'alien', cp: 'U+1F47D' },
  robot: { char: '🤖', name: 'robot face', cp: 'U+1F916' },
  cat: { char: '🐱', name: 'cat face', cp: 'U+1F431' },
  dog: { char: '🐶', name: 'dog face', cp: 'U+1F436' },
  pizza: { char: '🍕', name: 'pizza', cp: 'U+1F355' },
  coffee: { char: '☕', name: 'hot beverage', cp: 'U+2615' },
  beer: { char: '🍺', name: 'beer mug', cp: 'U+1F37A' },
  money: { char: '💰', name: 'money bag', cp: 'U+1F4B0' },
  dollar: { char: '💵', name: 'dollar banknote', cp: 'U+1F4B5' },
  chart_up: { char: '📈', name: 'chart increasing', cp: 'U+1F4C8' },
  chart_down: { char: '📉', name: 'chart decreasing', cp: 'U+1F4C9' },
  bitcoin: { char: '₿', name: 'bitcoin sign', cp: 'U+20BF' },
  lock: { char: '🔒', name: 'locked', cp: 'U+1F512' },
  key: { char: '🔑', name: 'key', cp: 'U+1F511' },
  bulb: { char: '💡', name: 'light bulb', cp: 'U+1F4A1' },
  book: { char: '📖', name: 'open book', cp: 'U+1F4D6' },
  computer: { char: '💻', name: 'laptop', cp: 'U+1F4BB' },
  phone: { char: '📱', name: 'mobile phone', cp: 'U+1F4F1' },
  globe: { char: '🌍', name: 'globe showing Europe-Africa', cp: 'U+1F30D' },
  sun: { char: '☀️', name: 'sun', cp: 'U+2600 U+FE0F' },
  moon: { char: '🌙', name: 'crescent moon', cp: 'U+1F319' },
  cloud: { char: '☁️', name: 'cloud', cp: 'U+2601 U+FE0F' },
  rain: { char: '🌧️', name: 'cloud with rain', cp: 'U+1F327 U+FE0F' },
  snow: { char: '❄️', name: 'snowflake', cp: 'U+2744 U+FE0F' },
  zap: { char: '⚡', name: 'high voltage', cp: 'U+26A1' },
  gift: { char: '🎁', name: 'gift', cp: 'U+1F381' },
  bell: { char: '🔔', name: 'bell', cp: 'U+1F514' },
  mag: { char: '🔍', name: 'magnifying glass tilted left', cp: 'U+1F50D' },
  link: { char: '🔗', name: 'link', cp: 'U+1F517' },
  paperclip: { char: '📎', name: 'paperclip', cp: 'U+1F4CE' },
  pencil: { char: '✏️', name: 'pencil', cp: 'U+270F U+FE0F' },
  calendar: { char: '📅', name: 'calendar', cp: 'U+1F4C5' },
  clock: { char: '⏰', name: 'alarm clock', cp: 'U+23F0' },
  hourglass: { char: '⏳', name: 'hourglass not done', cp: 'U+23F3' },
  trophy: { char: '🏆', name: 'trophy', cp: 'U+1F3C6' },
  medal: { char: '🥇', name: '1st place medal', cp: 'U+1F947' },
  target: { char: '🎯', name: 'bullseye', cp: 'U+1F3AF' },
  game: { char: '🎮', name: 'video game controller', cp: 'U+1F3AE' },
  music: { char: '🎵', name: 'musical note', cp: 'U+1F3B5' },
  mic: { char: '🎤', name: 'microphone', cp: 'U+1F3A4' },
  camera: { char: '📸', name: 'camera with flash', cp: 'U+1F4F8' },
  art: { char: '🎨', name: 'artist palette', cp: 'U+1F3A8' },
  party: { char: '🎉', name: 'party popper', cp: 'U+1F389' },
  cake: { char: '🎂', name: 'birthday cake', cp: 'U+1F382' },
  balloon: { char: '🎈', name: 'balloon', cp: 'U+1F388' },
};

function routeEmoji(u, res, json) {
  const q = u.searchParams;
  const key = (q.get('name') || q.get('q') || '').toLowerCase().trim();
  const text = q.get('strip');

  if (text !== null) {
    // strip all emoji/non-BMP symbol chars from text
    const cleaned = text.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2B00}-\u{2BFF}\u{1F1E6}-\u{1F1FF}]/gu, '').replace(/\s+/g, ' ').trim();
    return json(res, 200, { input_length: text.length, output: cleaned });
  }
  if (!key) return json(res, 200, { count: Object.keys(EMOJI).length, emojis: EMOJI });
  if (EMOJI[key]) return json(res, 200, { key, ...EMOJI[key] });
  const matches = Object.entries(EMOJI)
    .filter(([k, v]) => k.includes(key) || v.name.includes(key))
    .map(([k, v]) => ({ key: k, ...v }));
  if (!matches.length) return json(res, 404, { error: `no emoji for: ${key}` });
  return json(res, 200, { count: matches.length, results: matches });
}
module.exports = { routeEmoji };
