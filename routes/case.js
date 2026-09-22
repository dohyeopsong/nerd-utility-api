// /case — text case conversions
function words(s) {
  return s.replace(/[_\-\.]+/g, ' ').split(/\s+/).filter(Boolean);
}

function toCamel(ws) {
  return ws.map((w, i) => {
    const l = w.toLowerCase();
    return i === 0 ? l : l[0].toUpperCase() + l.slice(1);
  }).join('');
}

function toPascal(ws) {
  return ws.map(w => w[0].toUpperCase() + w.slice(1).toLowerCase()).join('');
}

function toSnake(ws) { return ws.map(w => w.toLowerCase()).join('_'); }
function toKebab(ws) { return ws.map(w => w.toLowerCase()).join('-'); }
function toConstant(ws) { return ws.map(w => w.toUpperCase()).join('_'); }
function toTitle(ws) { return ws.map(w => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(' '); }
function toSentence(ws) {
  const s = ws.join(' ').toLowerCase();
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}
function toPath(ws) { return ws.map(w => w.toLowerCase()).join('/'); }

function routeCase(u, res, json) {
  const q = u.searchParams;
  const text = q.get('text') || '';
  const mode = (q.get('to') || 'all').toLowerCase();

  if (!text) {
    return json(res, 400, {
      error: 'provide ?text=hello world',
      note: 'Case conversions. ?to= camel|pascal|snake|kebab|constant|title|sentence|path (default: all)'
    });
  }

  const ws = words(text);
  const all = {
    camel: toCamel(ws),
    pascal: toPascal(ws),
    snake: toSnake(ws),
    kebab: toKebab(ws),
    constant: toConstant(ws),
    title: toTitle(ws),
    sentence: toSentence(ws),
    path: toPath(ws),
    upper: text.toUpperCase(),
    lower: text.toLowerCase()
  };

  if (mode !== 'all') {
    if (!(mode in all)) {
      return json(res, 400, { error: 'unknown mode: ' + mode, valid_modes: Object.keys(all) });
    }
    return json(res, 200, { input: text, to: mode, result: all[mode] });
  }

  return json(res, 200, { input: text, conversions: all });
}

module.exports = { routeCase };
