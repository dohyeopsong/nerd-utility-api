// Morse code translator: text <-> morse, auto-detects direction
const MORSE = {
  A:'.-', B:'-...', C:'-.-.', D:'-..', E:'.', F:'..-.', G:'--.', H:'....',
  I:'..', J:'.---', K:'-.-', L:'.-..', M:'--', N:'-.', O:'---', P:'.--.',
  Q:'--.-', R:'.-.', S:'...', T:'-', U:'..-', V:'...-', W:'.--', X:'-..-',
  Y:'-.--', Z:'--..', '0':'-----', '1':'.----', '2':'..---', '3':'...--',
  '4':'....-', '5':'.....', '6':'-....', '7':'--...', '8':'---..', '9':'----.',
  '.':'.-.-.-', ',':'--..--', '?':'..--..', "'":'.----.', '!':'-.-.--',
  '/':'-..-.', '(':'-.--.', ')':'-.--.-', '&':'.-...', ':':'---...',
  ';':'-.-.-.', '=':'-...-', '+':'.-.-.', '-':'-....-', '_':'..--.-',
  '"':'.-..-.', '$':'...-..-', '@':'.--.-.'
};
const REV = Object.fromEntries(Object.entries(MORSE).map(([k, v]) => [v, k]));

function routeMorse(u, res, json) {
  const input = u.searchParams.get('text') || u.searchParams.get('morse') || '';
  if (!input) return json(res, 400, { error: 'missing text param' });
  const isMorse = /^[.\-/. ]+$/.test(input.trim()) && /[.\-]/.test(input);
  if (isMorse) {
    const decoded = input.trim().split(/\s*\/\s*|\s{3,}/).map(word =>
      word.trim().split(/\s+/).map(c => REV[c] ?? '#').join('')
    ).join(' ');
    return json(res, 200, { input, direction: 'morse->text', text: decoded });
  }
  const upper = input.toUpperCase();
  const encoded = upper.split(/\s+/).map(word =>
    word.split('').map(c => MORSE[c] ?? '').filter(Boolean).join(' ')
  ).join(' / ');
  const unsupported = [...new Set(upper.split('').filter(c => c !== ' ' && !MORSE[c]))];
  return json(res, 200, { input, direction: 'text->morse', morse: encoded, unsupported });
}
module.exports = { routeMorse };
