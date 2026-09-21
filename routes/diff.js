// Line-based text diff (LCS algorithm) producing unified-style output
function lcsMatrix(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--)
    for (let j = n - 1; j >= 0; j--)
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  return dp;
}
function diffLines(aText, bText) {
  const a = aText.split('\n'), b = bText.split('\n');
  const dp = lcsMatrix(a, b);
  const ops = [];
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { ops.push({ t: ' ', line: a[i] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { ops.push({ t: '-', line: a[i] }); i++; }
    else { ops.push({ t: '+', line: b[j] }); j++; }
  }
  while (i < a.length) { ops.push({ t: '-', line: a[i++] }); }
  while (j < b.length) { ops.push({ t: '+', line: b[j++] }); }
  return ops;
}
function routeDiff(u, res, json) {
  const q = Object.fromEntries(new URL(u, 'http://x').searchParams);
  if (q.a === undefined || q.b === undefined) return json(res, 400, { error: 'provide ?a=<text>&b=<text> (or POST JSON {a,b})' });
  const ops = diffLines(String(q.a), String(q.b));
  const unified = ops.map(o => o.t + o.line).join('\n');
  const added = ops.filter(o => o.t === '+').length;
  const removed = ops.filter(o => o.t === '-').length;
  return json(res, 200, { added, removed, unchanged: ops.length - added - removed, unified, ops });
}
module.exports = { routeDiff, diffLines };
