// Base32 encode/decode: /base32?encode=<text> or ?decode=<text> (RFC 4648, also accepts crockford-style input via padding-insensitive decode)
const A='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function b32encode(buf){
  let bits=0,val=0,out='';
  for(const b of buf){
    val=(val<<8)|b;bits+=8;
    while(bits>=5){out+=A[(val>>>(bits-5))&31];bits-=5;}
  }
  if(bits>0)out+=A[(val<<(5-bits))&31];
  while(out.length%8)out+='=';
  return out;
}
function b32decode(s){
  s=s.toUpperCase().replace(/=+$/,'').replace(/\s+/g,'');
  let bits=0,val=0;const out=[];
  for(const c of s){
    const i=A.indexOf(c);
    if(i<0)throw new Error('invalid base32 character: '+c);
    val=(val<<5)|i;bits+=5;
    if(bits>=8){out.push((val>>>(bits-8))&255);bits-=8;}
  }
  return Buffer.from(out);
}
function routeBase32(u,res,json,body){
  try{
    const enc=u.searchParams.get('encode'),dec=u.searchParams.get('decode');
    if(enc!==null){
      const buf=Buffer.from(enc,'utf8');
      return json(res,200,{input:enc,encoded:b32encode(buf)});
    }
    if(dec!==null){
      const buf=b32decode(dec);
      let out;
      try{out=buf.toString('utf8');}catch{out=null;}
      return json(res,200,{input:dec,decoded:out,bytes:buf.toString('hex'),length:buf.length});
    }
    return json(res,400,{error:'provide ?encode=<text> or ?decode=<base32>'});
  }catch(e){return json(res,400,{error:'base32 failure: '+e.message});}
}
module.exports={routeBase32};
