// Luhn algorithm: /luhn?number=<digits> — validate, compute check digit
function luhnCheckDigit(digits){
  // compute check digit for a payload (number without check digit)
  let sum=0;const d=digits.split('').map(Number).reverse();
  for(let i=0;i<d.length;i++){
    let n=d[i];
    if(i%2===0){n*=2;if(n>9)n-=9;}  // doubling depends on offset from check digit
    sum+=n;
  }
  return (10-(sum%10))%10;
}
function isValidLuhn(numStr){
  const d=numStr.split('').map(Number);
  if(d.some(isNaN))return null;
  const check=d.pop();
  return luhnCheckDigit(d.join(''))===check;
}
function routeLuhn(u,res,json){
  try{
    const numStr=(u.searchParams.get('number')||u.searchParams.get('n')||'').replace(/[\s-]/g,'');
    if(!numStr)return json(res,400,{error:'provide ?number=<digits>'});
    if(!/^\d+$/.test(numStr))return json(res,400,{error:'digits only (spaces/dashes allowed)'});
    const valid=isValidLuhn(numStr);
    const withoutCheck=numStr.slice(0,-1);
    return json(res,200,{
      number:numStr,
      length:numStr.length,
      valid,
      checkDigit:+numStr.slice(-1),
      computedCheckDigit:luhnCheckDigit(withoutCheck),
      message:valid?'valid Luhn number':'fails Luhn checksum'
    });
  }catch(e){return json(res,500,{error:'luhn failure: '+e.message});}
}
module.exports={routeLuhn,isValidLuhn,luhnCheckDigit};
