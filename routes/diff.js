// /diff — line-based text diff (LCS algorithm)
function diffLines(a, b) {
  const A = a.split('\n'), B = b.split('\n');
  const n = A.length, m = B.length;
  // LCS table
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  // Walk
  const out = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) { out.push({ type: ' ', line: A[i], a: i + 1, b: j + 1 }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ type: '-', line: A[i], a: i + 1 }); i++; }
    else { out.push({ type: '+', line: B[j], b: j + 1 }); j++; }
  }
  while (i < n) { out.push({ type: '-', line: A[i], a: ++i }); }
  while (j < m) { out.push({ type: '+', line: B[j], b: ++j }); }
  return out;
}

function routeDiff(u, res, json) {
  const q = Object.fromEntries(u.searchParams.entries());
  if (q.a === undefined || q.b === undefined) throw new Error('provide ?a=<text>&b=<text> (URL-encoded)');
  const d = diffLines(q.a, q.b);
  const added = d.filter(x => x.type === '+').length;
  const removed = d.filter(x => x.type === '-').length;
  const same = d.filter(x => x.type === ' ').length;
  if (q.unified === '1' || q.raw === '1') {
    const body = d.map(x => x.type + x.line).join('\n');
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end(body);
  }
  return json(res, 200, {
    identical: added === 0 && removed === 0,
    summary: { added, removed, unchanged: same },
    diff: d.slice(0, 1000)
  });
}

module.exports = { routeDiff, diffLines };
