// IMEI/IMEISV validator: Luhn check + TAC/FAC/serial decomposition
const { luhnCheck } = require('./luhn.js');
function validateIMEI(input) {
  const imei = String(input).replace(/[\s-]/g, '');
  if (!/^\d{15}$/.test(imei)) {
    if (/^\d{16}$/.test(imei)) {
      return { valid: false, format: 'IMEISV(16-digit)', reason: 'IMEISV has no check digit; use 15-digit IMEI for validation' };
    }
    return { valid: false, reason: 'IMEI must be 15 digits (got ' + imei.length + ')' };
  }
  const luhn = luhnCheck(imei);
  return {
    input: imei, valid: luhn.valid, format: 'IMEI(15-digit)',
    reason: luhn.valid ? null : 'Luhn check digit mismatch',
    luhnSum: luhn.luhnSum,
    tac: imei.slice(0, 8), fac: imei.slice(8, 10),
    serial: imei.slice(10, 14), checkDigit: imei[14]
  };
}
function routeImei(u, res, json) {
  const q = Object.fromEntries(new URL(u, 'http://x').searchParams);
  if (!q.imei) return json(res, 400, { error: 'provide ?imei=<15-digit IMEI>' });
  return json(res, 200, validateIMEI(q.imei));
}
module.exports = { routeImei, validateIMEI };
