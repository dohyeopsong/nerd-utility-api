// EAN/UPC barcode validator: EAN-8, EAN-13, UPC-A checksums + GS1 prefix country lookup
const GS1 = {
  '000-019':'US/Canada','030-039':'US','060-139':'US/Canada','300-379':'France','380':'Bulgaria',
  '383':'Slovenia','385':'Croatia','400-440':'Germany','450-459':'Japan','460-469':'Russia',
  '471':'Taiwan','474':'Estonia','475':'Latvia','477':'Lithuania','480':'Philippines',
  '484':'Moldova','485':'Armenia','489':'Hong Kong','490-499':'Japan','500-509':'UK',
  '520-521':'Greece','528':'Lebanon','529':'Cyprus','535':'Malta','539':'Ireland',
  '540-549':'Belgium/Luxembourg','560':'Portugal','569':'Iceland','570-579':'Denmark',
  '590':'Poland','594':'Romania','599':'Hungary','600-601':'South Africa','608':'Bahrain',
  '611':'Morocco','613':'Algeria','619':'Tunisia','620':'Tanzania','621':'Syria',
  '625':'Jordan','626':'Iran','640-649':'Finland','690-699':'China','700-709':'Norway',
  '729':'Israel','730-739':'Sweden','740-745':'Central America','750':'Mexico',
  '754-755':'Canada','759':'Venezuela','760-769':'Switzerland','770-771':'Colombia',
  '773':'Uruguay','775':'Peru','777':'Bolivia','778-779':'Argentina','780':'Chile',
  '784':'Paraguay','786':'Ecuador','789-790':'Brazil','800-839':'Italy','840-849':'Spain',
  '850':'Cuba','858':'Slovakia','859':'Czech Republic','860':'Serbia','865':'Mongolia',
  '867':'North Korea','868-869':'Turkey','870-879':'Netherlands','880':'South Korea',
  '884':'Cambodia','885':'Thailand','888':'Singapore','890':'India','893':'Vietnam',
  '896':'Pakistan','899':'Indonesia','900-919':'Austria','930-939':'Australia',
  '940-949':'New Zealand','950':'GS1 Global Office','955':'Malaysia','958':'Macau',
  '977':'ISSN (periodicals)','978-979':'ISBN (books)','980':'Refund receipts','981-984':'Coupons',
  '99':'Coupons'
};
function checksum(d) { // weighted sum (odd pos x3)
  let sum = 0;
  for (let i = 0; i < d.length; i++) {
    let n = +d[i];
    if (d.length % 2 === 0) sum += i % 2 === 0 ? n : n * 3;
    else sum += i % 2 === 0 ? n * 3 : n;
  }
  return sum;
}
function gs1Lookup(n13) {
  const n = parseInt(n13, 10);
  for (const [range, name] of Object.entries(GS1)) {
    if (range.includes('-')) {
      const [a, b] = range.split('-').map(Number);
      if (n >= a && n <= b) return name;
    } else if (n === Number(range)) return name;
  }
  return 'unknown/GS1 member';
}
function upcExpand(e) { // UPC-E (8 digit) to UPC-A (12 digit)
  if (e.length !== 8 || e[0] !== '0') return null;
  const p = e.slice(1, 7), c = e[6];
  const map = { '0': p[0]+p[1]+p[2]+'0000'+p[3]+p[4], '1': p[0]+p[1]+p[2]+p[3]+'00000'+p[4], '2': p[0]+p[1]+p[2]+'00000'+p[3]+p[4], '3': p[0]+p[1]+'00000'+p[2]+p[3]+p[4] };
  if (c >= '0' && c <= '3') return map[c];
  if (c === '4') return p[0]+p[1]+p[2]+p[3]+'0000'+p[4];
  if (c === '5') return p+'0000'+c+'0' && p.slice(0,5)+'0000'+p[5]+'0';
  if (c >= '5' && c <= '9') return p+'0000'+c;
  return null;
}
function validate(input) {
  const d = String(input || '').replace(/[\s-]/g, '');
  if (!/^\d+$/.test(d)) return { error: 'input must contain digits only' };
  if (d.length === 13 || d.length === 12 || d.length === 8) {
    const body = d.slice(0, -1), check = +d[d.length - 1];
    const expected = (10 - (checksum(body + '0') % 10)) % 10;
    // recompute properly: checksum of body, check digit = (10 - (sum mod 10)) mod 10
    let sum = 0;
    for (let i = 0; i < body.length; i++) {
      const weight = (body.length % 2 === 0) ? (i % 2 === 0 ? 1 : 3) : (i % 2 === 0 ? 3 : 1);
      sum += +body[i] * weight;
    }
    const exp = (10 - (sum % 10)) % 10;
    const out = {
      digits: d.length,
      type: d.length === 13 ? 'EAN-13' : d.length === 12 ? 'UPC-A' : 'EAN-8',
      checkDigitProvided: d[d.length - 1],
      checkDigitExpected: String(exp),
      valid: check === exp
    };
    if (!out.valid) out.reason = `check digit should be ${exp}`;
    if (d.length === 13) {
      out.gs1Prefix = d.slice(0, 3);
      out.country = gs1Lookup(d.slice(0, 3));
      out.companyPrefix = d.slice(0, 7);
    }
    if (d.length === 12 && d[0] === '0') out.note = 'leading 0: this UPC-A is an EAN-13 with prefix 0 (US/Canada)';
    return out;
  }
  return { error: 'length must be 8 (EAN-8), 12 (UPC-A), or 13 (EAN-13)' };
}
function validateUpcE(input) {
  const d = String(input || '').replace(/[\s-]/g, '');
  if (d.length !== 8 || !/^\d+$/.test(d) || d[0] !== '0') return { error: 'UPC-E must be 8 digits starting with 0' };
  const expanded = upcExpand(d);
  if (!expanded) return { error: 'invalid UPC-E encoding' };
  const r = validate(expanded);
  return { type: 'UPC-E', upcE: d, expandedUpcA: expanded, ...r };
}
function routeEan(u, res, json) {
  const q = Object.fromEntries(new URL(u, 'http://x').searchParams);
  if (q.upce) return json(res, 200, validateUpcE(q.upce));
  if (!q.ean && !q.n) return json(res, 400, { error: 'missing ?ean= parameter (or ?upce= for UPC-E)' });
  return json(res, 200, validate(q.ean || q.n));
}
module.exports = { routeEan, validate, validateUpcE };
