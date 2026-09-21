// /ean?code=4006381333931 → EAN-8/13, UPC-A checksum validation + GS1 country lookup
const GS1 = { '00-13':'USA/Canada','20-29':'In-store','30-37':'France','380':'Bulgaria','383':'Slovenia','385':'Croatia','400-440':'Germany','45,49':'Japan','460-469':'Russia','471':'Taiwan','474':'Estonia','480':'Philippines','484':'Moldova','485':'Armenia','489':'Hong Kong','490-499':'Japan','500-509':'UK','520':'Greece','528':'Lebanon','529':'Cyprus','531':'Macedonia','535':'Malta','539':'Ireland','54':'Belgium/Luxembourg','560':'Portugal','569':'Iceland','57':'Denmark','590':'Poland','594':'Romania','599':'Hungary','600-601':'South Africa','603':'Ghana','608':'Bahrain','609':'Mauritius','611':'Morocco','613':'Algeria','615':'Nigeria','616':'Kenya','618':'Ivory Coast','619':'Tunisia','620':'Tanzania','621':'Syria','622':'Egypt','625':'Jordan','626':'Iran','64':'Finland','690-695':'China','70':'Norway','729':'Israel','73':'Sweden','740-745':'Central America','746':'Dominican Republic','750':'Mexico','754-755':'Canada','759':'Venezuela','76':'Switzerland','770-771':'Colombia','773':'Uruguay','775':'Peru','777':'Bolivia','778-779':'Argentina','780':'Chile','784':'Paraguay','786':'Ecuador','789-790':'Brazil','80-83':'Italy','84':'Spain','850':'Cuba','858':'Slovakia','859':'Czech Republic','860':'Serbia','865':'Mongolia','867':'North Korea','868-869':'Turkey','87':'Netherlands','880':'South Korea','884':'Cambodia','885':'Thailand','888':'Singapore','890':'India','893':'Vietnam','896':'Pakistan','899':'Indonesia','90-91':'Austria','93':'Australia','94':'New Zealand','955':'Malaysia','958':'Macau','977':'ISSN (periodicals)','978-979':'ISBN (books)','980':'refund receipts','981-984':'coupons','99':'coupons' };
function gs1Country(g) {
  for (const [k, v] of Object.entries(GS1)) {
    for (const part of k.split(',')) {
      if (part.includes('-')) { const [a, b] = part.split('-').map(Number); if (g >= a && g <= b) return v; }
      else if (g === +part) return v;
    }
  }
  return null;
}
function routeEan(u, res, json) {
  const raw = u.searchParams.get('code') || u.searchParams.get('ean');
  if (!raw) return json(res, 400, { error: 'pass code=<8/12/13/14 digit barcode>' });
  const code = raw.replace(/\s+/g, '');
  if (!/^\d{8}$|^\d{12}$|^\d{13}$|^\d{14}$/.test(code)) return json(res, 400, { error: 'must be 8, 12, 13, or 14 digits' });

  const type = code.length === 8 ? 'EAN-8' : code.length === 12 ? 'UPC-A' : code.length === 13 ? 'EAN-13' : 'GTIN-14 (EAN-13 + package level)';
  const body = code.slice(0, -1), check = +code.slice(-1);
  // weights alternate 3,1 starting from right of body
  let sum = 0;
  const digits = body.split('').reverse();
  for (let i = 0; i < digits.length; i++) sum += +digits[i] * (i % 2 === 0 ? 3 : 1);
  const expected = (10 - (sum % 10)) % 10;
  const valid = expected === check;

  let gs = null, country = null;
  if (code.length >= 13) { gs = +code.slice(0, 3); country = gs1Country(gs); }
  else if (code.length === 12) { gs = +code.slice(0, 3); country = gs1Country(gs); }

  return json(res, 200, { code, type, valid, checkDigit: check, expectedCheckDigit: expected, gs1Prefix: gs, country: country || 'unknown/other' });
}
module.exports = { routeEan };
