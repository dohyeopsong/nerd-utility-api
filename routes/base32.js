// Base32 (RFC 4648) encode/decode: /base32?encode=<text> or /base32?decode=<b32>
const ALPHA='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function b32encode(buf){
  let bits=0,value=0,out='';
  for(const byte of buf){
    value=(value<<8)|byte;bits+=8;
    while(bits>=5){out+=ALPHA[(value>>>(bits-5))&31];bits-=5;}
  }
  if(bits>0)out+=ALPHA[(value<<(5-bits))&31];
  while(out.length%8)out+='=';
  return out;
}
function b32decode(s){
  s=String(s).replace(/=+$/,'').replace(/\s+/g,'').toUpperCase();
  let bits=0,value=0;const out=[];
  for(const ch of s){
    const idx=ALPHA.indexOf(ch);
    if(idx<0)throw new Error('invalid base32 character: '+ch);
    value=(value<<5)|idx;bits+=5;
    if(bits>=8){out.push((value>>>(bits-8))&255);bits-=8;}
  }
  return Buffer.from(out);
}
function routeBase32(u,res,json,body){
  try{
    const enc=u.searchParams.get('encode')||(body&&body.encode);
    const dec=u.searchParams.get('decode')||(body&&body.decode);
    if(!enc&&!dec)return json(res,400,{error:'provide ?encode=<text> or ?decode=<base32 string>'});
    if(enc){
      const buf=Buffer.from(String(enc),'utf8');
      return json(res,200,{input:String(enc),encoded:b32encode(buf),inputBytes:buf.length});
    }
    try{
      const buf=b32decode(String(dec));
      return json(res,200,{input:String(dec),decoded:buf.toString('utf8'),decodedBytes:buf.length,hex:buf.toString('hex')});
    }catch(e){return json(res,400,{error:'decode failure: '+e.message});}
  }catch(e){return json(res,400,{error:'base32 failure: '+e.message});}
}
module.exports={routeBase32,b32encode,b32decode};
