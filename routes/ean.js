// EAN-8/13/UPC-A barcode validator + GS1 prefix lookup + UPC-E expansion
const GS1 = {'00-13':'GS1 US','30-37':'GS1 France','40-44':'GS1 Germany','45-49':'GS1 Japan','50':'GS1 UK','57':'GS1 Denmark','64':'GS1 Finland','70-79':'GS1 Norway','80-83':'GS1 Italy','84':'GS1 Spain','90-91':'GS1 Austria','93':'GS1 Australia','94':'GS1 New Zealand','600-601':'GS1 South Africa','690-699':'GS1 China','754-755':'GS1 Canada','87':'GS1 Netherlands','88':'GS1 Korea, South','888':'GS1 Singapore','890':'GS1 India','893':'GS1 Vietnam','899':'GS1 Indonesia','900-919':'GS1 Austria','930-939':'GS1 Australia','955':'GS1 Malaysia','958':'GS1 Macau'};
function clean(s) { return String(s).replace(/[\s-]/g, ''); }
function checksum(d) {
  // EAN-13/UPC-A: weight 3 on odd positions from right
  let sum = 0;
  const rev = d.split('').reverse();
  for (let i = 0; i < rev.length - 1; i++) sum += +rev[i] * (i % 2 === 0 ? 3 : 1);
  return (10 - (sum % 10)) % 10;
}
function eanChecksum(d, len) {
  // For EAN-8: weight 3 on even positions from right; standard: alternate starting 3 from rightmost-of-body
  let sum = 0;
  const n = d.length;
  for (let i = n - 1, w = 3; i >= 0; i--, w = 4 - w) sum += +d[i] * w; // w alternates 3,1
  return (10 - (sum % 10)) % 10;
}
function upcEexpand(u) {
  // UPC-E 8 digits incl leading 0 and check; expand to UPC-A
  if (!/^\d{8}$/.test(u) || u[0] !== '0') return null;
  const mid = u.slice(1, 7), last = u[6];
  let body;
  if (last <= 2) body = mid.slice(0, 2) + last + '0000' + mid.slice(2);
  else if (last === 3) body = mid + '00000';
  else if (last === 4) body = mid + '0000';
  else body = mid + '000' + last;
  return body + u[7];
}
function gs1Lookup(full) {
  const num = parseInt(full.slice(0, 3), 10);
  for (const [range, name] of Object.entries(GS1)) {
    const [lo, hi] = range.split('-').map(x => parseInt(x, 10));
    if (num >= lo && num <= hi) return name;
  }
  return null;
}
function routeEan(u, res, json) {
  const q = Object.fromEntries(new URL(u, 'http://x').searchParams);
  const input = q.ean || q.number || q.code;
  if (!input) return json(res, 400, { error: 'provide ?ean=<EAN-8, EAN-13, UPC-A, or UPC-E>' });
  const c = clean(input);
  if (!/^\d{8}$|^\d{12}$|^\d{13}$/.test(c))
    return json(res, 400, { error: 'expected 8 (UPC-E), 12 (UPC-A), 13 (EAN-13), or 8 (EAN-8) digits' });
  try {
    if (c.length === 13) {
      const ok = eanChecksum(c.slice(0, 12)) === +c[12];
      return json(res, 200, { input, normalized: c, type: 'EAN-13', valid: ok, gs1: gs1Lookup(c), checkDigit: +c[12] });
    }
    if (c.length === 12) {
      const ok = eanChecksum(c.slice(0, 11)) === +c[11];
      return json(res, 200, { input, normalized: c, type: 'UPC-A', valid: ok, gs1: gs1Lookup(c), checkDigit: +c[11] });
    }
    if (c.length === 8 && c[0] === '0') {
      // ambiguous: try UPC-E expansion first
      const upcA = upcEexpand(c);
      if (upcA) {
        const ok = eanChecksum(upcA.slice(0, 11)) === +upcA[11];
        return json(res, 200, { input, normalized: c, type: 'UPC-E', valid: ok, expanded: upcA, gs1: gs1Lookup(upcA), checkDigit: +c[7] });
      }
    }
    // EAN-8
    const ok = eanChecksum(c.slice(0, 7), 8) === +c[7];
    return json(res, 200, { input, normalized: c, type: 'EAN-8', valid: ok, checkDigit: +c[7] });
  } catch (e) { return json(res, 400, { error: e.message }); }
}
module.exports = { routeEan, eanChecksum, upcEexpand, gs1Lookup };
