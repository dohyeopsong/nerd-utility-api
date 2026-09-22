// Base32 encode/decode: /base32?encode=<text> or ?decode=<b32> — RFC 4648
const B32='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function b32encode(s){
  const bytes=Buffer.from(s,'utf8');
  let bits=0,value=0,out='';
  for(const b of bytes){
    value=(value<<8)|b;bits+=8;
    while(bits>=5){out+=B32[(value>>>(bits-5))&31];bits-=5;}
  }
  if(bits>0)out+=B32[(value<<(5-bits))&31];
  while(out.length%8!==0)out+='=';
  return out;
}
function b32decode(s){
  s=s.replace(/=+$/,'').replace(/\s+/g,'').toUpperCase();
  if(!/^[A-Z2-7]*$/.test(s))throw new Error('invalid base32 characters');
  let bits=0,value=0;const bytes=[];
  for(const ch of s){
    value=(value<<5)|B32.indexOf(ch);bits+=5;
    if(bits>=8){bytes.push((value>>>(bits-8))&255);bits-=8;}
  }
  return Buffer.from(bytes).toString('utf8');
}
function routeBase32(u,res,json,body){
  try{
    let enc=u.searchParams.get('encode'),dec=u.searchParams.get('decode');
    if(!enc&&!dec&&body&&typeof body==='object'){enc=body.encode;dec=body.decode;}
    if(enc&&dec)return json(res,400,{error:'provide only one of ?encode= or ?decode='});
    if(!enc&&!dec)return json(res,400,{error:'provide ?encode=<text> or ?decode=<base32>'});
    if(enc){
      if(enc.length>100000)return json(res,413,{error:'input too large (100KB max)'});
      return json(res,200,{input:enc.slice(0,200),encoded:b32encode(enc)});
    }
    if(dec.length>200000)return json(res,413,{error:'input too large (200KB max)'});
    return json(res,200,{input:dec.slice(0,200),decoded:b32decode(dec)});
  }catch(e){return json(res,400,{error:'base32 failure: '+e.message});}
}
module.exports={routeBase32};
