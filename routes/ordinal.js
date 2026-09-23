// /ordinal — number to ordinal suffix (1st) and to English words (one hundred two)
const SMALL = ['zero','one','two','three','four','five','six','seven','eight','nine','ten',
  'eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const TENS = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
const SCALES = ['','thousand','million','billion','trillion'];

function toWords(n) {
  if (n === 0) return 'zero';
  if (n < 20) return SMALL[n];
  if (n < 100) return TENS[Math.floor(n/10)] + (n%10 ? '-' + SMALL[n%10] : '');
  if (n < 1000) return SMALL[Math.floor(n/100)] + ' hundred' + (n%100 ? ' ' + toWords(n%100) : '');
  let si = 0; let rest = n; const parts = [];
  const groups = [];
  while (rest > 0) { groups.unshift(rest % 1000); rest = Math.floor(rest / 1000); si++; }
  si = groups.length - 1;
  for (const g of groups) {
    if (g === 0) { si--; continue; }
    parts.push(toWords(g) + (SCALES[si] ? ' ' + SCALES[si] : ''));
    si--;
  }
  return parts.join(' ');
}

function ordSuffix(n) {
  const v = n % 100;
  if (v >= 11 && v <= 13) return 'th';
  return ['th','st','nd','rd'][n % 10] || 'th';
}

function routeOrdinal(u, res, json) {
  const p = u.searchParams;
  const raw = p.get('n') || p.get('q');
  if (raw === null || raw === '') return json(res, 400, { error: 'provide ?n=<integer> (mode=ordinal default, or ?words=1 for spelled-out)' });
  const n = parseInt(raw, 10);
  if (!Number.isInteger(n) || Math.abs(n) > 999999999999) {
    return json(res, 400, { error: 'n must be an integer up to ±999999999999' });
  }
  const neg = n < 0; const a = Math.abs(n);
  if (p.get('words') || p.get('mode') === 'words') {
    return json(res, 200, { n, words: (neg ? 'negative ' : '') + toWords(a) });
  }
  if (a === 0) return json(res, 200, { n, ordinal: 'zeroth' });
  const special = {1:'first',2:'second',3:'third',4:'fourth',5:'fifth',6:'sixth',7:'seventh',8:'eighth',9:'ninth',10:'tenth',11:'eleventh',12:'twelfth'};
  if (!neg && special[a]) return json(res, 200, { n, ordinal: special[a] });
  // apply suffix to last unit word: 21 -> twenty-first, 111 -> one hundred first
  const unit = a % 10; const teen = a % 100 >= 11 && a % 100 <= 13;
  const words = toWords(a);
  if (!neg && unit >= 1 && unit <= 3 && !teen) {
    const lastSpecial = special[unit];
    const stem = toWords(a - unit);
    return json(res, 200, { n, ordinal: stem + '-' + lastSpecial });
  }
  return json(res, 200, { n, ordinal: words + ordSuffix(a) });
}
module.exports = { routeOrdinal };
