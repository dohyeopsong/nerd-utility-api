// /hashids — encode non-negative integers to short unique strings and back
// (URL-ID obfuscation, not cryptographic). Alphabet excludes lookalikes 0/O/1/I/l.

const ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ23456789';
const LOTTERY = 'WgJxYzLqKdVbNcRfTmHnPsZM';

function shuffle(chars, salt) {
  let h = 0;
  for (const c of salt) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const arr = chars.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) >>> 0;
    const j = h % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join('');
}

function routeHashids(u, res, json) {
  const p = u.searchParams;
  const salt = p.get('salt') || '';
  const alphabet = shuffle(ALPHABET, salt || 'default');

  // single-integer encode/decode: "L" + base-62-style digits in salt-shuffled alphabet
  const encode = (n) => {
    if (!Number.isInteger(n) || n < 0 || n > Number.MAX_SAFE_INTEGER) throw new Error('number must be a non-negative integer');
    const lotteryChar = LOTTERY[n % LOTTERY.length];
    const sub = shuffle(alphabet, salt + lotteryChar);
    let out = '';
    let v = n;
    do { out = sub[v % sub.length] + out; v = Math.floor(v / sub.length); } while (v > 0);
    return lotteryChar + out;
  };
  const decode = (id) => {
    const lotteryChar = id[0];
    const sub = shuffle(alphabet, salt + lotteryChar);
    let n = 0;
    for (const c of id.slice(1)) {
      const v = sub.indexOf(c);
      if (v < 0) throw new Error(`invalid character '${c}' in id`);
      n = n * sub.length + v;
    }
    return n;
  };

  const id = p.get('id') || p.get('decode');
  const numStr = p.get('number') || p.get('encode') || p.get('numbers');
  try {
    if (numStr !== null && numStr !== undefined && numStr !== '') {
      const nums = numStr.split(',').map(s => parseInt(s.trim(), 10));
      return json(res, 200, { input: nums, ids: nums.map(encode) });
    }
    if (id) {
      return json(res, 200, { id, number: decode(id) });
    }
    return json(res, 400, { error: 'provide ?number=12345 (encode) or ?id=<string> (decode), optional ?salt=' });
  } catch (e) {
    return json(res, 400, { error: e.message });
  }
}
module.exports = { routeHashids };
