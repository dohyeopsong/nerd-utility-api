// JWT decoder: /jwt?token=<jwt> or POST {"token":...} — decode header/payload, check expiry (no verification)
function b64urlDecode(s){
  s=s.replace(/-/g,'+').replace(/_/g,'/');
  while(s.length%4)s+='=';
  return Buffer.from(s,'base64').toString('utf8');
}
function routeJwt(u,res,json,body){
  try{
    let token=u.searchParams.get('token')||u.searchParams.get('t')||u.searchParams.get('jwt');
    if(!token&&body&&typeof body==='object'&&(body.token||body.jwt))token=body.token||body.jwt;
    if(!token)return json(res,400,{error:'provide ?token=<JWT> (decode only, no signature verification)'});
    const parts=token.trim().split('.');
    if(parts.length!==3)return json(res,400,{error:'invalid JWT: expected 3 dot-separated parts'});
    let header,payload;
    try{header=JSON.parse(b64urlDecode(parts[0]));}catch{return json(res,400,{error:'invalid header segment'});}
    try{payload=JSON.parse(b64urlDecode(parts[1]));}catch{return json(res,400,{error:'invalid payload segment'});}
    const now=Math.floor(Date.now()/1000);
    const exp=payload.exp,iat=payload.iat,nbf=payload.nbf;
    const timeInfo={};
    if(exp!==undefined)timeInfo.expiresAt=new Date(exp*1000).toISOString(),timeInfo.expired=now>=exp,timeInfo.secondsUntilExpiry=exp-now;
    if(iat!==undefined)timeInfo.issuedAt=new Date(iat*1000).toISOString();
    if(nbf!==undefined)timeInfo.notBefore=new Date(nbf*1000).toISOString(),timeInfo.notYetValid=now<nbf;
    return json(res,200,{header,payload,...timeInfo,algorithm:header.alg,type:header.typ||'JWT',verified:false,note:'decoded only — signature not verified'});
  }catch(e){return json(res,500,{error:'jwt failure: '+e.message});}
}
module.exports={routeJwt};
