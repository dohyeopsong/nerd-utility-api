// Line diff (LCS-based): unified-style added/removed/unchanged output
function lineDiff(a, b) {
  const A = String(a).replace(/\r/g,'').split('\n');
  const B = String(b).replace(/\r/g,'').split('\n');
  const n = A.length, m = B.length;
  // LCS table
  const dp = Array.from({length: n+1}, () => new Array(m+1).fill(0));
  for (let i = n-1; i >= 0; i--)
    for (let j = m-1; j >= 0; j--)
      dp[i][j] = A[i] === B[j] ? dp[i+1][j+1] + 1 : Math.max(dp[i+1][j], dp[i][j+1]);
  const ops = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) { ops.push({ type: 'same', line: A[i], aLine: i+1, bLine: j+1 }); i++; j++; }
    else if (dp[i+1][j] >= dp[i][j+1]) { ops.push({ type: 'removed', line: A[i], aLine: i+1 }); i++; }
    else { ops.push({ type: 'added', line: B[j], bLine: j+1 }); j++; }
  }
  while (i < n) { ops.push({ type: 'removed', line: A[i], aLine: ++i }); }
  while (j < m) { ops.push({ type: 'added', line: B[j], bLine: ++j }); }
  return { added: ops.filter(o=>o.type==='added').length, removed: ops.filter(o=>o.type==='removed').length, unchanged: ops.filter(o=>o.type==='same').length, ops };
}
function routeDiff(u, res, json) {
  const q = Object.fromEntries(new URL(u, 'http://x').searchParams);
  if (q.a === undefined || q.b === undefined) return json(res, 400, { error: 'provide ?a=<text>&b=<text>' });
  const d = lineDiff(q.a, q.b);
  if (q.format === 'text') {
    const txt = d.ops.map(o => (o.type==='added' ? '+ ' : o.type==='removed' ? '- ' : '  ') + o.line).join('\n');
    res.writeHead(200, {'Content-Type':'text/plain'}); return res.end(txt);
  }
  return json(res, 200, d);
}
module.exports = { routeDiff, lineDiff };
