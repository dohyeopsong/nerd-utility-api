// /tin — US Taxpayer Identification Number validation (EIN, SSN, ITIN, ATIN)
function routeTin(u, res, json) {
  const p = u.searchParams;
  const raw = (p.get('tin') || p.get('t') || '').trim();
  const tin = raw.replace(/[\s-]/g, '');

  if (!tin) {
    return json(res, 200, { usage: '?tin=12-3456789 (EIN) or 123-45-6789 (SSN). Auto-detects type.' });
  }

  if (!/^\d{9}$/.test(tin)) {
    return json(res, 400, { tin: raw, error: 'TIN must be 9 digits (dashes/spaces allowed)' });
  }

  const first2 = tin.slice(0, 2);
  const first3 = tin.slice(0, 3);
  const middle2 = tin.slice(3, 5);
  let type, valid = true, notes = [];

  // SSN: area 001-899 (not 000, 666, 900-999), group 01-99, serial 0001-9999
  if (/^\d{3}$/.test(first3)) {
    const area = Number(first3), group = Number(middle2), serial = Number(tin.slice(5));
    if (area >= 1 && area <= 899 && area !== 666 && group >= 1 && serial >= 1) {
      type = 'SSN (Social Security Number)';
    }
  }

  // ITIN: 900-999 area, 70-88 group (pre-2013: 70-99)
  if (!type) {
    const area = Number(first3), group = Number(middle2);
    if (area >= 900 && area <= 999 && group >= 70 && group <= 88) {
      type = 'ITIN (Individual Taxpayer Identification Number)';
    } else if (area >= 900 && area <= 999 && group >= 90 && group <= 99) {
      type = 'ITIN (pre-2013 range, now expired)';
      notes.push('ITINs with middle digits 90-99 expired in 2015 unless renewed');
    } else if (area >= 900 && area <= 999) {
      type = 'ITIN-range but invalid group';
      valid = false;
    }
  }

  // ATIN: 900-999 area with group 90
  // EIN: starts with 2-digit campus prefix 01-99, cannot be 00 or 07-09
  if (!type) {
    const prefix = Number(first2);
    if (prefix >= 1 && prefix <= 99 && ![7, 8, 9].includes(prefix)) {
      type = 'EIN (Employer Identification Number)';
    }
  }

  if (!type) { type = 'unknown/invalid TIN pattern'; valid = false; }

  // Known invalid SSNs
  if (type.startsWith('SSN')) {
    if (first3 === '078' || first3 === '219' || first3 === '650') notes.push('area previously invalidated (078, 219, 650)');
    if (tin === '123456789') { valid = false; notes.push('famous Woolworth SSN, invalidated'); }
    if (tin === '078051120') { valid = false; notes.push('most misused SSN in history (F.W. Woolworth)'); }
  }

  return json(res, 200, {
    tin: `${tin.slice(0, 3)}-${tin.slice(3, 5)}-${tin.slice(5)}`,
    raw: tin,
    type,
    valid,
    ...(notes.length ? { notes } : {})
  });
}

module.exports = { routeTin };
