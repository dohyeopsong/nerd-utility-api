// /loan — loan / mortgage payment calculator
function routeLoan(u, res, json) {
  const q = u.searchParams;
  const P = parseFloat(q.get('principal'));   // loan amount
  const annualRate = parseFloat(q.get('rate')); // annual % e.g. 6.5
  const years = parseFloat(q.get('years') || q.get('term'));
  const mode = (q.get('mode') || 'payment').toLowerCase();

  if (!P || P <= 0) return json(res, 400, { error: 'principal required (> 0)' });
  if (isNaN(annualRate) || annualRate < 0) return json(res, 400, { error: 'rate required (annual %, >= 0)' });
  if (!years || years <= 0) return json(res, 400, { error: 'years required (> 0)' });

  const n = Math.round(years * 12);
  const r = annualRate / 100 / 12;

  let monthly;
  if (r === 0) monthly = P / n;
  else monthly = (P * r) / (1 - Math.pow(1 + r, -n));

  const totalPaid = monthly * n;
  const totalInterest = totalPaid - P;

  const out = {
    principal: P,
    annual_rate: annualRate,
    term_years: years,
    months: n,
    monthly_payment: round2(monthly),
    total_paid: round2(totalPaid),
    total_interest: round2(totalInterest),
  };

  if (mode === 'amortization' || q.get('amortization') === '1') {
    // full amortization schedule (cap at 600 rows)
    const sched = [];
    let bal = P;
    const rows = Math.min(n, 600);
    for (let m = 1; m <= rows; m++) {
      const int = bal * r;
      const prin = monthly - int;
      bal = Math.max(0, bal - prin);
      sched.push({ month: m, payment: round2(monthly), principal: round2(prin), interest: round2(int), balance: round2(bal) });
    }
    out.amortization = sched;
    out.amortization_truncated = n > 600;
  }
  return json(res, 200, out);
}
function round2(x) { return Math.round(x * 100) / 100; }
module.exports = { routeLoan };
