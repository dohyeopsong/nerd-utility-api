// /interest — compound interest / savings growth calculator
function routeInterest(u, res, json) {
  const q = u.searchParams;
  const P = parseFloat(q.get('principal'));        // initial amount
  const annualRate = parseFloat(q.get('rate'));    // annual %
  const years = parseFloat(q.get('years'));
  const monthly = parseFloat(q.get('monthly') || '0');  // monthly contribution
  const freq = parseInt(q.get('frequency') || '12', 10); // compounds per year
  const mode = (q.get('mode') || 'compound').toLowerCase();

  if (isNaN(P) || P < 0) return json(res, 400, { error: 'principal required (>= 0)' });
  if (isNaN(annualRate)) return json(res, 400, { error: 'rate required (annual %)' });
  if (isNaN(years) || years <= 0) return json(res, 400, { error: 'years required (> 0)' });
  if (![1, 2, 4, 12, 365].includes(freq)) return json(res, 400, { error: 'frequency must be 1, 2, 4, 12, or 365' });

  const r = annualRate / 100;
  const n = years;

  let finalBalance, totalContributions, totalInterest;
  if (monthly > 0) {
    // contributions compound at same frequency, simplified: simulate monthly
    let bal = P;
    const mRate = Math.pow(1 + r / freq, freq / 12) - 1; // effective monthly rate matching compounding
    totalContributions = P;
    for (let m = 0; m < Math.round(years * 12); m++) {
      bal = bal * (1 + mRate) + monthly;
      totalContributions += monthly;
    }
    finalBalance = bal;
    totalInterest = finalBalance - totalContributions;
  } else {
    finalBalance = P * Math.pow(1 + r / freq, freq * years);
    totalContributions = P;
    totalInterest = finalBalance - P;
  }
  const out = {
    principal: P,
    annual_rate: annualRate,
    years,
    compounding_frequency: freq,
    monthly_contribution: monthly || 0,
    final_balance: round2(finalBalance),
    total_contributions: round2(totalContributions),
    total_interest: round2(totalInterest),
  };
  if (mode === 'simple') {
    out.simple_interest = round2(P * r * years);
  }
  return json(res, 200, out);
}
function round2(x) { return Math.round(x * 100) / 100; }
module.exports = { routeInterest };
