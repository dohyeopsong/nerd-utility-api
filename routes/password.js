// Password strength: /password?pw=<string> — entropy, crack time, weakness reasons
function entropyBits(pw){
  let pool=0;
  if(/[a-z]/.test(pw))pool+=26;
  if(/[A-Z]/.test(pw))pool+=26;
  if(/[0-9]/.test(pw))pool+=10;
  if(/[^a-zA-Z0-9]/.test(pw))pool+=33;
  if(pool===0)return 0;
  // unique chars reduce repetition bonus
  const uniq=new Set(pw).size;
  return pw.length*Math.log2(pool)*(uniq/pw.length)*0.9+pw.length*Math.log2(uniq||1)*0.1;
}
function crackTime(bits){
  // assume 1e10 guesses/sec (modern GPU cluster)
  const secs=Math.pow(2,bits-1)/1e10;
  const units=[[3.154e7,'years'],[86400,'days'],[3600,'hours'],[60,'minutes'],[1,'seconds']];
  if(secs<1)return 'instantly';
  for(const[s,n]of units){if(secs>=s){const v=secs/s;return v>1e6?v.toExponential(2)+' '+n:Math.round(v)+' '+n;}}
  return 'instantly';
}
function routePassword(u,res,json,body){
  try{
    let pw=null;
    if(body&&body.pw!==undefined)pw=body.pw;
    else pw=u.searchParams.get('pw')||u.searchParams.get('password');
    if(pw===null)return json(res,400,{error:'provide ?pw=<password> (or POST JSON {pw})'});
    if(pw===null||pw===undefined)return json(res,400,{error:'provide ?pw=<password>'});
    const bits=Math.round(entropyBits(pw));
    const weaknesses=[];
    if(pw.length<8)weaknesses.push('too short (<8 chars)');
    if(pw.length<12)weaknesses.push('short (<12 chars)');
    if(!/[A-Z]/.test(pw))weaknesses.push('no uppercase');
    if(!/[a-z]/.test(pw))weaknesses.push('no lowercase');
    if(!/[0-9]/.test(pw))weaknesses.push('no digits');
    if(!/[^a-zA-Z0-9]/.test(pw))weaknesses.push('no symbols');
    if(/^(.)\1+$/.test(pw))weaknesses.push('all same character');
    if(/^[a-zA-Z]+\d{1,4}!?$/.test(pw))weaknesses.push('common word+digits pattern');
    if(/password|123456|qwerty|letmein|admin|welcome|iloveyou/i.test(pw))weaknesses.push('contains common word');
    let score=0;
    if(bits>28)score+=1;
    if(bits>36)score+=1;
    if(bits>60)score+=1;
    if(bits>80)score+=1;
    const labels=['very weak','weak','fair','strong','very strong'];
    return json(res,200,{
      length:pw.length,entropyBits:bits,crackTime:crackTime(bits),
      score:score,strength:labels[score],weaknesses:weaknesses
    });
  }catch(e){return json(res,400,{error:'pw failure: '+e.message});}
}
module.exports={routePassword,entropyBits,crackTime};
