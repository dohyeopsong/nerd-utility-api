// /number — base conversion, parsing, and formatting
function routeNumber(u, res, json) {
  const q = Object.fromEntries(u.searchParams.entries());
  const mode = (q.mode || 'convert').toLowerCase();

  if (mode === 'convert') {
    const value = q.value;
    if (value === undefined) throw new Error('provide ?value=<number>');
    const from = parseInt(q.from || '10', 10);
    const to = parseInt(q.to || '10', 10);
    if (!(2 <= from && from <= 36) || !(2 <= to && to <= 36)) throw new Error('from/to must be 2-36');
    let n;
    if (/^-?0x/i.test(value) && from === 10) n = parseInt(value, 16);
    else if (/^-?0b/i.test(value) && from === 10) n = parseInt(value, 2);
    else n = parseInt(value, from);
    if (isNaN(n)) throw new Error('invalid value for base ' + from);
    return json(res, 200, {
      input: value, from, to,
      decimal: n,
      result: n.toString(to),
      representations: { bin: n.toString(2), oct: n.toString(8), dec: n.toString(10), hex: n.toString(16) }
    });
  }

  if (mode === 'format') {
    const n = Number(q.value);
    if (isNaN(n)) throw new Error('provide ?value=<number>');
    const locales = (q.locale || 'en-US').split(',');
    const style = q.style || 'decimal';
    const opts = {};
    if (style === 'currency') { opts.style = 'currency'; opts.currency = q.currency || 'USD'; }
    else if (style === 'percent') { opts.style = 'percent'; }
    else if (q.decimals !== undefined) { opts.minimumFractionDigits = opts.maximumFractionDigits = parseInt(q.decimals, 10); }
    return json(res, 200, {
      input: q.value,
      formats: Object.fromEntries(locales.map(l => [l, new Intl.NumberFormat(l, opts).format(n)]))
    });
  }

  if (mode === 'bytes') {
    let n = Number(q.value);
    if (isNaN(n)) throw new Error('provide ?value=<number of bytes>');
    const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    let i = 0;
    let v = n;
    while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
    const round = q.round !== '0';
    return json(res, 200, { bytes: n, human: (round ? Math.round(v * 100) / 100 : v) + ' ' + units[i] });
  }

  throw new Error('mode must be convert, format, or bytes');
}

module.exports = { routeNumber };
