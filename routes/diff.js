// Text diff: line-based LCS diff, unified diff format, change stats
function lcsDiff(a, b) {
  const A = a.split('\n'), B = b.split('\n');
  const n = A.length, m = B.length;
  // LCS table (cap size for safety)
  if (n * m > 4e6) throw new Error('inputs too large for diff (max ~2000x2000 lines)');
  const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const ops = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) { ops.push({ t: ' ', line: A[i] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { ops.push({ t: '-', line: A[i] }); i++; }
    else { ops.push({ t: '+', line: B[j] }); j++; }
  }
  while (i < n) ops.push({ t: '-', line: A[i++] });
  while (j < m) ops.push({ t: '+', line: B[j++] });
  return ops;
}
function routeDiff(u, res, json) {
  const q = Object.fromEntries(new URL(u, 'http://x').searchParams);
  const a = q.a, b = q.b;
  if (a === undefined || b === undefined) return json(res, 400, { error: 'provide ?a=<text1>&b=<text2> (URL-encoded)' });
  try {
    const ops = lcsDiff(a, b);
    const unified = ops.map(o => o.t + o.line).join('\n');
    const added = ops.filter(o => o.t === '+').length;
    const removed = ops.filter(o => o.t === '-').length;
    const same = ops.filter(o => o.t === ' ').length;
    return json(res, 200, {
      identical: added === 0 && removed === 0,
      stats: { linesAdded: added, linesRemoved: removed, linesUnchanged: same, linesA: a.split('\n').length, linesB: b.split('\n').length },
      unifiedDiff: unified,
      ops: ops.map(o => ({ op: o.t === '+' ? 'add' : o.t === '-' ? 'remove' : 'same', line: o.line })),
    });
  } catch (e) {
    return json(res, 400, { error: e.message });
  }
}
module.exports = { routeDiff };
