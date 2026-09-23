// /bmi — body mass index calculator with WHO categories
function routeBmi(u, res, json) {
  const p = u.searchParams;
  const weight = parseFloat(p.get('weight')); // kg
  const height = parseFloat(p.get('height')); // cm
  if (!p.get('weight') || !p.get('height')) return json(res, 200, { usage: '?weight=70&height=175 (kg, cm). Add &imperial=1 for lb/in.', categories: { underweight: '<18.5', normal: '18.5-24.9', overweight: '25-29.9', obese: '>=30' } });
  if (!Number.isFinite(weight) || !Number.isFinite(height) || weight <= 0 || height <= 0) return json(res, 400, { error: 'weight and height must be positive numbers' });

  let w = weight, h = height;
  if (p.get('imperial') === '1') { w = weight * 0.45359237; h = height * 2.54; }

  const meters = h / 100;
  const bmi = +(w / (meters * meters)).toFixed(1);
  let category;
  if (bmi < 18.5) category = 'underweight';
  else if (bmi < 25) category = 'normal';
  else if (bmi < 30) category = 'overweight';
  else category = 'obese';

  // healthy weight range for this height
  const minW = +(18.5 * meters * meters).toFixed(1);
  const maxW = +(24.9 * meters * meters).toFixed(1);
  return json(res, 200, { bmi, category, healthy_weight_range_kg: [minW, maxW], height_m: +meters.toFixed(2), weight_kg: +w.toFixed(1) });
}
module.exports = { routeBmi };
