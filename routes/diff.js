// Text diff: LCS-based line diff with unified output
function lcsMatrix(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({length: m+1}, () => new Array(n+1).fill(0));
  for (let i = m-1; i >= 0; i--) for (let j = n-1; j >= 0; j--)
    dp[i][j] = a[i] === b[j] ? dp[i+1][j+1] + 1 : Math.max(dp[i+1][j], dp[i][j+1]);
  return dp;
}
function diffLines(textA, textB) {
  const a = textA.split('\n'), b = textB.split('\n');
  const dp = lcsMatrix(a, b);
  const ops = [];
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { ops.push({type:' ', text:a[i]}); i++; j++; }
    else if (dp[i+1][j] >= dp[i][j+1]) { ops.push({type:'-', text:a[i]}); i++; }
    else { ops.push({type:'+', text:b[j]}); j++; }
  }
  while (i < a.length) { ops.push({type:'-', text:a[i]}); i++; }
  while (j < b.length) { ops.push({type:'+', text:b[j]}); j++; }
  return ops;
}
function unifiedDiff(textA, textB, labelA='a', labelB='b') {
  const ops = diffLines(textA, textB);
  return ops.map(o => o.type + o.text).join('\n');
}
function routeDiff(u, res, json) {
  const q = Object.fromEntries(new URL(u, 'http://x').searchParams);
  if (!q.a || q.b === undefined) return json(res, 400, { error: 'provide ?a=<text>&b=<text> (line diff)' });
  try {
    const ops = diffLines(q.a, q.b);
    return json(res, 200, {
      inputA: q.a, inputB: q.b,
      added: ops.filter(o => o.type === '+').length,
      removed: ops.filter(o => o.type === '-').length,
      unchanged: ops.filter(o => o.type === ' ').length,
      unified: unifiedDiff(q.a, q.b),
      ops: ops.map(o => ({op: o.type === ' ' ? 'same' : o.type === '+' ? 'add' : 'remove', line: o.text}))
    });
  } catch (e) { return json(res, 400, { error: e.message }); }
}
module.exports = { routeDiff, diffLines, unifiedDiff };
