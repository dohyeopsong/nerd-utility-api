// /random — random generator: numbers, hex, dice, pick from list, shuffle
const crypto = require('crypto');

function randInt(min, max) { // inclusive, crypto-based
  const range = max - min + 1;
  if (range <= 0) throw new Error('max must be >= min');
  const bytes = crypto.randomBytes(6);
  const val = bytes.readUIntBE(0, 6);
  return min + (val % range);
}

function routeRandom(u, res, json) {
  const q = u.searchParams;

  // 1. ?list=a,b,c&count=N — pick or shuffle
  const listStr = q.get('list');
  if (listStr !== null) {
    const items = listStr.split(',').map(s => s.trim()).filter(s => s.length > 0);
    if (!items.length) return json(res, 400, { error: 'list is empty after parsing' });
    const shuffle = q.get('mode') === 'shuffle';
    if (shuffle) {
      const arr = items.slice();
      for (let i = arr.length - 1; i > 0; i--) {
        const j = randInt(0, i);
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return json(res, 200, { shuffled: arr });
    }
    const count = Math.min(parseInt(q.get('count') || '1', 10) || 1, items.length);
    const picked = [];
    const pool = items.slice();
    for (let i = 0; i < count; i++) picked.push(pool.splice(randInt(0, pool.length - 1), 1)[0]);
    return json(res, 200, { picked });
  }

  // 2. ?dice=N — roll N six-sided dice
  const dice = q.get('dice');
  if (dice !== null) {
    const n = Math.min(Math.max(parseInt(dice, 10) || 1, 1), 100);
    const rolls = Array.from({ length: n }, () => randInt(1, 6));
    return json(res, 200, { rolls, total: rolls.reduce((a, b) => a + b, 0) });
  }

  // 3. ?hex=N — N random hex chars
  const hex = q.get('hex');
  if (hex !== null) {
    const n = Math.min(Math.max(parseInt(hex, 10) || 32, 1), 1024);
    return json(res, 200, { hex: crypto.randomBytes(Math.ceil(n / 2)).toString('hex').slice(0, n) });
  }

  // 4. default: integer in [min,max]
  const min = parseInt(q.get('min') || '0', 10) || 0;
  const max = parseInt(q.get('max') || '100', 10);
  if (isNaN(max) || max < min) return json(res, 400, { error: 'max must be >= min' });
  if (max - min > Number.MAX_SAFE_INTEGER) return json(res, 400, { error: 'range too large' });
  return json(res, 200, { min, max, value: randInt(min, max) });
}
module.exports = { routeRandom };
