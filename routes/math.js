// /math — safe arithmetic expression evaluator (no eval, custom parser)
function tokenize(src) {
  const tokens = [];
  let i = 0;
  const isDigit = c => c >= '0' && c <= '9';
  while (i < src.length) {
    const c = src[i];
    if (c === ' ') { i++; continue; }
    if (isDigit(c) || c === '.') {
      let j = i;
      while (j < src.length && (isDigit(src[j]) || src[j] === '.')) j++;
      const num = src.slice(i, j);
      if ((num.match(/\./g) || []).length > 1) throw new Error(`bad number: ${num}`);
      tokens.push({ t: 'num', v: parseFloat(num) });
      i = j; continue;
    }
    if ('+-*/%^()'.includes(c)) { tokens.push({ t: c }); i++; continue; }
    throw new Error(`unexpected character: ${c}`);
  }
  return tokens;
}

function parse(tokens) {
  let pos = 0;
  const peek = () => tokens[pos];
  const next = () => tokens[pos++];

  function parseExpr() { // + -
    let v = parseTerm();
    while (peek() && (peek().t === '+' || peek().t === '-')) {
      const op = next().t;
      const r = parseTerm();
      v = op === '+' ? v + r : v - r;
    }
    return v;
  }
  function parseTerm() { // * / %
    let v = parseUnary();
    while (peek() && (peek().t === '*' || peek().t === '/' || peek().t === '%')) {
      const op = next().t;
      const r = parseUnary();
      if ((op === '/' || op === '%') && r === 0) throw new Error('division by zero');
      v = op === '*' ? v * r : op === '/' ? v / r : v % r;
    }
    return v;
  }
  function parseUnary() {
    if (peek() && peek().t === '-') { next(); return -parseUnary(); }
    if (peek() && peek().t === '+') { next(); return parseUnary(); }
    return parsePow();
  }
  function parsePow() { // ^ right-assoc, binds tighter than unary minus on base
    const base = parsePrimary();
    if (peek() && peek().t === '^') { next(); return Math.pow(base, parseUnary()); }
    return base;
  }
  function parsePrimary() {
    const tok = next();
    if (!tok) throw new Error('unexpected end of expression');
    if (tok.t === 'num') return tok.v;
    if (tok.t === '(') {
      const v = parseExpr();
      const close = next();
      if (!close || close.t !== ')') throw new Error('missing closing parenthesis');
      return v;
    }
    throw new Error(`unexpected token: ${tok.t}`);
  }

  const result = parseExpr();
  if (pos < tokens.length) throw new Error(`unexpected token: ${tokens[pos].t}`);
  return result;
}

function routeMath(u, res, json) {
  const q = u.searchParams;
  const expr = (q.get('expr') || q.get('e') || '').trim();
  if (!expr) return json(res, 400, { error: 'missing expr parameter', example: '/math?expr=2%2B3*4' });
  if (expr.length > 500) return json(res, 400, { error: 'expression too long (max 500 chars)' });
  try {
    const result = parse(tokenize(expr));
    if (!isFinite(result)) return json(res, 400, { error: 'result is not finite', expr });
    return json(res, 200, {
      expr,
      result,
      integer: Number.isInteger(result),
    });
  } catch (e) {
    return json(res, 400, { error: e.message, expr });
  }
}
module.exports = { routeMath };
