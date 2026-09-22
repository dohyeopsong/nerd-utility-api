// /roman — Roman numeral converter (integer <-> roman)
const NUM = [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];
const VAL = { I:1,V:5,X:10,L:50,C:100,D:500,M:1000 };

function toRoman(n) {
  if (!Number.isInteger(n) || n < 1 || n > 3999) throw new Error('number must be integer 1-3999');
  let out = '';
  for (const [v, s] of NUM) while (n >= v) { out += s; n -= v; }
  return out;
}
function fromRoman(s) {
  s = s.toUpperCase().trim();
  if (!/^[MDCLXVI]+$/.test(s)) throw new Error('invalid roman numeral: ' + s);
  // strict validation: no invalid subtractive patterns, no more than 3 repeats
  if (/IIII|XXXX|CCCC|MMMM|VV|LL|DD/.test(s)) throw new Error('invalid roman numeral (repeat rule): ' + s);
  let total = 0;
  for (let i = 0; i < s.length; i++) {
    const c = VAL[s[i]], n = VAL[s[i+1]];
    if (n && c < n) {
      // subtractive pair must be valid (IV, IX, XL, XC, CD, CM)
      const pair = s[i] + s[i+1];
      if (!['IV','IX','XL','XC','CD','CM'].includes(pair)) throw new Error('invalid subtractive pair: ' + pair);
      total += n - c; i++;
    } else total += c;
  }
  if (total < 1 || total > 3999) throw new Error('value out of range 1-3999');
  return total;
}

function routeRoman(u, res, json) {
  const q = u.searchParams;
  try {
    const num = q.get('num') || q.get('n');
    const rom = q.get('roman') || q.get('r');
    if (num !== null && num !== '') {
      const n = parseInt(num, 10);
      return json(res, 200, { number: n, roman: toRoman(n) });
    }
    if (rom) {
      const v = fromRoman(rom);
      return json(res, 200, { roman: rom.toUpperCase(), number: v, valid: true });
    }
    throw new Error('provide ?num=2026 or ?roman=MMXXVI');
  } catch (e) {
    return json(res, 400, { error: e.message, example: '/roman?num=2026 or /roman?roman=MMXXVI' });
  }
}
module.exports = { routeRoman };
