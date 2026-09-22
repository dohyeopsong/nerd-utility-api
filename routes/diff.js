// Text diff: /diff?a=<text>&b=<text> (or POST {a,b})
// Returns a Myers-style line diff plus unified patch output.
function diffLines(a,b){
  const A=a.split('\n'),B=b.split('\n');
  const n=A.length,m=B.length;
  // classic LCS via dynamic programming (fine for moderate inputs)
  const dp=Array.from({length:n+1},()=>new Array(m+1).fill(0));
  for(let i=n-1;i>=0;i--)
    for(let j=m-1;j>=0;j--)
      dp[i][j]=A[i]===B[j]?dp[i+1][j+1]+1:Math.max(dp[i+1][j],dp[i][j+1]);
  // walk
  const hunks=[];
  let i=0,j=0;
  const out=[];
  while(i<n&&j<m){
    if(A[i]===B[j]){out.push({t:' ',line:A[i],a:i+1,b:j+1});i++;j++;}
    else if(dp[i+1][j]>=dp[i][j+1]){out.push({t:'-',line:A[i],a:i+1});i++;}
    else{out.push({t:'+',line:B[j],b:j+1});j++;}
  }
  while(i<n){out.push({t:'-',line:A[i],a:i+1});i++;}
  while(j<m){out.push({t:'+',line:B[j],b:j+1});j++;}
  return out;
}
function unified(a,b,ops){
  const lines=['--- a','+++ b'];
  let k=0;
  while(k<ops.length){
    if(ops[k].t===' '){k++;continue;}
    // find hunk extent: run of non-context with up to 3 context each side
    let s=k;while(k<ops.length&&ops[k].t!==' ')k++;
    let e=k;let c=0;
    while(e<ops.length&&c<3){if(ops[e].t===' ')c++;else c=0;e++;}
    if(c>0)e-=c;
    const start=Math.max(0,s-3);
    const slice=ops.slice(start,e);
    const aStart=(slice[0].a||1),bStart=(slice.find(o=>o.b)?slice.find(o=>o.b).b:1);
    const aLen=slice.filter(o=>o.t!=='+'&&o.a).length;
    const bLen=slice.filter(o=>o.t!=='-'&&o.b).length;
    lines.push('@@ -'+aStart+','+aLen+' +'+bStart+','+bLen+' @@');
    for(const o of slice)lines.push(o.t+o.line);
  }
  return lines.join('\n');
}
function routeDiff(u,res,json,body){
  try{
    const a=u.searchParams.get('a')||(body&&body.a);
    const b=u.searchParams.get('b')||(body&&body.b);
    if(a===undefined||a===null||b===undefined||b===null)
      return json(res,400,{error:'provide ?a=<text>&b=<text> or POST {"a":"...","b":"..."}'});
    const ops=diffLines(String(a),String(b));
    const added=ops.filter(o=>o.t==='+').length;
    const removed=ops.filter(o=>o.t==='-').length;
    return json(res,200,{
      identical:a===b,
      linesAdded:added,linesRemoved:removed,
      summary:added+' added, '+removed+' removed',
      unified:unified(String(a),String(b),ops),
      ops:ops.map(o=>({t:o.t,line:o.line}))
    });
  }catch(e){return json(res,400,{error:'diff failure: '+e.message});}
}
module.exports={routeDiff,diffLines};
