// Luhn checksum: /luhn?number=4532015112830366 — validate + checksum digit computation
function luhnDigit(numStr){
  // compute the check digit needed to make numStr valid
  const d=numStr.replace(/\D/g,'');
  let sum=0,alt=true; // alt=true means next appended digit is doubled
  for(let i=d.length-1;i>=0;i--){
    let n=+d[i];
    if(alt){n*=2;if(n>9)n-=9;}
    sum+=n;alt=!alt;
  }
  return (10-(sum%10))%10;
}
function routeLuhn(u,res,json){
  try{
    let number=(u.searchParams.get('number')||u.searchParams.get('n')||'').trim();
    if(!number)return json(res,400,{error:'provide ?number=<digits>'});
    const digits=number.replace(/\D/g,'');
    if(digits.length<2)return json(res,400,{error:'need at least 2 digits'});
    // validate: full string (incl. check digit) must have Luhn sum % 10 == 0
    let sum=0,alt=false;
    for(let i=digits.length-1;i>=0;i--){
      let n=+digits[i];
      if(alt){n*=2;if(n>9)n-=9;}
      sum+=n;alt=!alt;
    }
    const valid=sum%10===0;
    const checkDigit=+digits[digits.length-1];
    const expected=luhnDigit(digits.slice(0,-1));
    return json(res,200,{number:digits,valid,checkDigit,expectedCheckDigit:expected,length:digits.length,cardType:detectCard(digits)});
  }catch(e){return json(res,500,{error:'luhn failure: '+e.message});}
}
function detectCard(d){
  if(/^4/.test(d))return 'visa';
  if(/^(5[1-5]|2[2-7])/.test(d))return 'mastercard';
  if(/^3[47]/.test(d))return 'amex';
  if(/^6(011|5)/.test(d))return 'discover';
  if(/^35/.test(d))return 'jcb';
  return null;
}
module.exports={routeLuhn};
