// Base58 encode/decode: /base58?encode=<text> or ?decode=<b58> — Bitcoin/IPFS alphabet
const B58='123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const B58M={};for(let i=0;i<B58.length;i++)B58M[B58[i]]=i;
function b58encode(s){
  const bytes=Buffer.from(s,'utf8');
  // count leading zeros -> '1's
  let z=0;while(z<bytes.length&&bytes[z]===0)z++;
  let digits=[0];
  for(let i=z;i<bytes.length;i++){
    let carry=bytes[i];
    for(let j=0;j<digits.length;j++){carry+=digits[j]<<8;digits[j]=carry%58;carry=(carry/58)|0;}
    while(carry>0){digits.push(carry%58);carry=(carry/58)|0;}
  }
  let out='1'.repeat(z);
  for(let i=digits.length-1;i>=0;i--)out+=B58[digits[i]];
  return out||'1';
}
function b58decode(s){
  const bytes=[0];
  let z=0;while(z<s.length&&s[z]==='1')z++;
  for(let i=0;i<s.length;i++){
    const v=B58M[s[i]];
    if(v===undefined)throw new Error('invalid base58 character: '+s[i]);
    let carry=v;
    for(let j=0;j<bytes.length;j++){carry+=bytes[j]*58;bytes[j]=carry&255;carry>>=8;}
    while(carry>0){bytes.push(carry&255);carry>>=8;}
  }
  // strip leading zeros from big-int representation, then re-add input zeros
  let zi=bytes.length-1;while(zi>=0&&bytes[zi]===0)zi--;
  const out=Buffer.from(bytes.slice(0,zi+1).reverse());
  return Buffer.concat([Buffer.alloc(z),out]).toString('utf8');
}
function routeBase58(u,res,json,body){
  try{
    let enc=u.searchParams.get('encode'),dec=u.searchParams.get('decode');
    if(!enc&&!dec&&body&&typeof body==='object'){enc=body.encode;dec=body.decode;}
    if(enc&&dec)return json(res,400,{error:'provide only one of ?encode= or ?decode='});
    if(!enc&&!dec)return json(res,400,{error:'provide ?encode=<text> or ?decode=<base58>'});
    if(enc){
      if(enc.length>100000)return json(res,413,{error:'input too large (100KB max)'});
      return json(res,200,{input:enc.slice(0,200),encoded:b58encode(enc)});
    }
    if(dec.length>200000)return json(res,413,{error:'input too large (200KB max)'});
    return json(res,200,{input:dec.slice(0,200),decoded:b58decode(dec)});
  }catch(e){return json(res,400,{error:'base58 failure: '+e.message});}
}
module.exports={routeBase58};
