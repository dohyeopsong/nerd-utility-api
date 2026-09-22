// /redact — scrub emails, phone numbers, credit-card-like numbers from text
function routeRedact(u, res, json) {
  const q = u.searchParams;
  const text = q.get('text') || '';
  if (!text) return json(res, 400, { error: 'text required' });
  let out = text, counts = {};
  const do_ = (name, re, repl) => {
    const m = out.match(re) || [];
    counts[name] = m.length;
    out = out.replace(re, repl);
  };
  do_('emails', /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[EMAIL]');
  do_('phones', /(?:\+?\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)|\d{2,4})[\s.-]?\d{3,4}[\s.-]?\d{4}\b/g, '[PHONE]');
  do_('cards', /\b(?:\d[ -]?){13,19}\b/g, (m) => {
    const digits = m.replace(/\D/g, '');
    if (digits.length < 13 || digits.length > 19) return m;
    // Luhn check
    let sum = 0, dbl = false;
    for (let i = digits.length - 1; i >= 0; i--) {
      let d = +digits[i];
      if (dbl) { d *= 2; if (d > 9) d -= 9; }
      sum += d; dbl = !dbl;
    }
    return sum % 10 === 0 ? '[CARD]' : m;
  });
  return json(res, 200, { redacted: out, counts });
}
module.exports = { routeRedact };
