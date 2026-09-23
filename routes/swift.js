// /swift — SWIFT/BIC bank identifier code validation (ISO 9362)
function routeSwift(u, res, json) {
  const p = u.searchParams;
  const raw = (p.get('swift') || p.get('bic') || p.get('s') || '').trim();
  const bic = raw.replace(/\s/g, '').toUpperCase();

  if (!bic) {
    return json(res, 200, { usage: '?swift=DEUTDEFF500 (8 or 11 chars: BBBB CC LL [XXX])' });
  }

  if (!/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(bic)) {
    return json(res, 400, { bic: raw, error: 'invalid BIC format (expected 4-letter bank code + 2-letter country + 2 alnum location + optional 3-char branch)' });
  }

  return json(res, 200, {
    bic,
    valid: true,
    bankCode: bic.slice(0, 4),
    country: bic.slice(4, 6),
    locationCode: bic.slice(6, 8),
    branchCode: bic.length === 11 ? bic.slice(8, 11) : null,
    type: bic.length === 8 ? 'BIC8 (primary office)' : 'BIC11 (specific branch)',
    ...(bic.length === 11 && bic.endsWith('XXX') ? { note: 'XXX branch code indicates primary office' } : {})
  });
}

module.exports = { routeSwift };
