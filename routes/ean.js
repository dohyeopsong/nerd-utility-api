// /ean — EAN/GTIN barcode validation (EAN-8, EAN-13, UPC-A via GTIN-12, GTIN-14)
function routeEan(u, res, json) {
  const p = u.searchParams;
  const raw = (p.get('ean') || p.get('code') || '').trim().replace(/[\s-]/g, '');
  const ean = raw;

  if (!ean) return json(res, 200, { usage: '?ean=4006381333931 (EAN-8/12/13/14, UPC-A accepted as 12 digits)' });
  if (!/^\d{8}$|^\d{12}$|^\d{13}$|^\d{14}$/.test(ean)) {
    return json(res, 400, { ean: raw, error: 'length must be 8, 12, 13, or 14 digits (EAN-8, UPC-A/GTIN-12, EAN-13, GTIN-14)' });
  }

  // GS1 mod-10: weights alternate 3 and 1, rightmost (check) digit weight 1
  const digits = ean.split('').map(Number);
  const check = digits.pop();
  let sum = 0;
  digits.reverse().forEach((d, i) => { sum += d * (i % 2 === 0 ? 3 : 1); });
  const expected = (10 - (sum % 10)) % 10;

  const type = { 8: 'EAN-8', 12: 'UPC-A (GTIN-12)', 13: 'EAN-13 (GTIN-13)', 14: 'GTIN-14 (ITF-14)' }[ean.length];
  const result = { code: ean, type, valid: check === expected, checkDigit: check, expectedCheckDigit: expected };

  if (ean.length === 13) {
    const prefixes = [['000-019', 'US/CA'], ['030-039', 'US'], ['040-049', 'US (internal)'], ['050-059', 'coupons'], ['060-139', 'US/CA'], ['300-379', 'FR/MC'], ['380', 'BG'], ['400-440', 'DE'], ['450-459,490-499', 'JP'], ['460-469', 'RU'], ['471', 'TW'], ['474', 'EE'], ['480', 'PH'], ['484', 'MD'], ['485', 'HR'], ['489', 'HK'], ['490-499', 'JP'], ['500-509', 'UK'], ['520', 'GR'], ['528', 'LB'], ['529', 'CY'], ['535', 'MT'], ['539', 'IE'], ['540-549', 'BE/LU'], ['560', 'PT'], ['569', 'IS'], ['570-579', 'DK'], ['590', 'PL'], ['594', 'RO'], ['599', 'HU'], ['600-601', 'ZA'], ['603', 'GH'], ['608', 'BH'], ['609', 'MU'], ['611', 'MA'], ['613', 'DZ'], ['619', 'TN'], ['620', 'TZ'], ['621', 'SY'], ['622', 'EG'], ['625', 'JO'], ['626', 'IR'], ['627', 'KW'], ['640-649', 'FI'], ['690-699', 'CN'], ['700-709', 'NO'], ['729', 'IL'], ['730-739', 'SE'], ['740-745', 'GT,SV,HN,NI,CR,PA'], ['746', 'DO'], ['750', 'MX'], ['754-755', 'CA'], ['759', 'VE'], ['760-769', 'CH'], ['770-771', 'CO'], ['773', 'UY'], ['775', 'PE'], ['777', 'BO'], ['778-779', 'AR'], ['780', 'CL'], ['784', 'PY'], ['786', 'EC'], ['789-790', 'BR'], ['800-839', 'IT,SM,VA'], ['840-849', 'ES'], ['850', 'CU'], ['858', 'SK'], ['859', 'CZ'], ['860', 'RS'], ['865', 'MN'], ['867', 'KP'], ['868-869', 'TR'], ['870-879', 'NL'], ['880', 'KR'], ['884', 'KH'], ['885', 'TH'], ['888', 'SG'], ['890', 'IN'], ['893', 'VN'], ['896', 'PK'], ['899', 'ID'], ['900-919', 'AT'], ['930-939', 'AU'], ['940-949', 'NZ'], ['950', 'GM'], ['955', 'MY'], ['958', 'MA'], ['977', 'ISSN'], ['978-979', 'ISBN'], ['980', 'refund receipts'], ['981-984', 'coupons'], ['990-999', 'coupons']];
    const three = parseInt(ean.slice(0, 3), 10);
    for (const [range, name] of prefixes) {
      for (const r of range.split(',')) {
        const [a, b] = r.includes('-') ? r.split('-').map(Number) : [Number(r), Number(r)];
        if (three >= a && three <= b) { result.country = name; break; }
      }
      if (result.country) break;
    }
  }

  return json(res, 200, result);
}

module.exports = { routeEan };
