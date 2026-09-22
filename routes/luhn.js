// /luhn — Luhn algorithm validation for card numbers, IMEIs, etc.
const NETWORKS = [
  { name: 'visa', prefixes: ['4'], lengths: [13, 16, 19] },
  { name: 'mastercard', prefixes: ['51','52','53','54','55','2221','2222','2223','2224','2225','2226','2227','2228','2229','223','224','225','226','227','228','229','23','24','25','26','270','271','272','270','2720'], lengths: [16] },
  { name: 'amex', prefixes: ['34','37'], lengths: [15] },
  { name: 'discover', prefixes: ['6011','65','644','645','646','647','648','649'], lengths: [16, 19] },
  { name: 'diners', prefixes: ['300','301','302','303','304','305','36','38'], lengths: [14] },
  { name: 'jcb', prefixes: ['3528','3529','353','354','355','356','357','358'], lengths: [16, 17, 18, 19] }
];
function luhnCheck(digits) {
  let sum = 0, alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = +digits[i];
    if (alt) { d *= 2; if (d > 9) d -= 9; }
    sum += d; alt = !alt;
  }
  return sum % 10 === 0;
}
function routeLuhn(u, res, json) {
  const q = u.searchParams;
  const num = (q.get('num') || q.get('n') || '').replace(/[\s-]/g, '');
  if (!num) return json(res, 400, { error: 'num required' });
  if (!/^\d+$/.test(num)) return json(res, 400, { error: 'digits only (spaces/dashes allowed)' });
  const valid = luhnCheck(num);
  const out = { input: num, valid, length: num.length };
  // card network detection (only for plausible card lengths 13-19)
  if (num.length >= 12 && num.length <= 19) {
    let matched = null;
    for (const net of NETWORKS) {
      if (net.prefixes.some(p => num.startsWith(p)) && net.lengths.includes(num.length)) { matched = net.name; break; }
    }
    if (matched) {
      out.card_network = matched;
      out.formatted = formatCard(num, matched);
    } else {
      out.card_network = null; // luhn-valid but no network match at this length
    }
    // generate a test number for the detected network (same prefix+length, valid luhn)
    if (matched && q.get('generate_test') === '1') {
      out.test_number = generateFor(num.slice(0, matched.prefixes.find(p => num.startsWith(p)).length), num.length);
    }
  }
  return json(res, 200, out);
}
function formatCard(num, net) {
  if (net === 'amex') return num.replace(/(\d{4})(\d{6})(\d{5})/, '$1 $2 $3');
  return num.replace(/(\d{4})(?=\d)/g, '$1 ');
}
function generateFor(prefix, len) {
  // fill random digits, compute luhn check digit
  let body = prefix;
  while (body.length < len - 1) body += Math.floor(Math.random() * 10);
  // find check digit
  for (let cd = 0; cd < 10; cd++) {
    if (luhnCheck(body + cd)) return body + cd;
  }
}
module.exports = { routeLuhn };
