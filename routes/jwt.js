// JWT decoder: /jwt?token=<header.payload.signature>
// Decodes header and payload (no signature verification — debugging tool).
function b64urlDecode(s){
  s=s.replace(/-/g,'+').replace(/_/g,'/');
  while(s.length%4)s+='=';
  return Buffer.from(s,'base64').toString('utf8');
}
function routeJwt(u,res,json,body){
  try{
    const token=u.searchParams.get('token')||(body&&body.token);
    if(!token)return json(res,400,{error:'provide ?token=<jwt>'});
    const parts=String(token).trim().split('.');
    if(parts.length<2||parts.length>3)return json(res,400,{error:'JWT must have 2 or 3 dot-separated segments'});
    let header,payload;
    try{header=JSON.parse(b64urlDecode(parts[0]));}
    catch(e){return json(res,400,{error:'invalid header segment (not base64url JSON)'});}
    try{payload=JSON.parse(b64urlDecode(parts[1]));}
    catch(e){return json(res,400,{error:'invalid payload segment (not base64url JSON)'});}
    const out={header,payload};
    if(parts[2])out.signature=parts[2];
    if(payload.exp){
      const expMs=payload.exp*1000;
      out.expiry=new Date(expMs).toISOString();
      out.expired=Date.now()>expMs;
      out.expiresIn=Math.max(0,expMs-Date.now());
    }
    if(payload.iat)out.issuedAt=new Date(payload.iat*1000).toISOString();
    if(payload.nbf)out.notBefore=new Date(payload.nbf*1000).toISOString();
    return json(res,200,out);
  }catch(e){return json(res,400,{error:'jwt failure: '+e.message});}
}
module.exports={routeJwt};
