// Luhn algorithm: /luhn?number=4532015112830366 — validate + compute check digit
function luhnDigit(s){ // s: digits without check digit
  let sum=0,alt=false;
  for(let i=s.length-1;i>=0;i--){
    let d=+s[i];
    if(alt){d*=2;if(d>9)d-=9;}
    sum+=d;alt=!alt;
  }
  return(10-(sum%10))%10;
}
function routeLuhn(u,res,json,body){
  try{
    let n=u.searchParams.get('number')||u.searchParams.get('n')||u.searchParams.get('luhn');
    if(!n&&body&&typeof body==='object'&&(body.number||body.n))n=body.number||body.n;
    if(!n)return json(res,400,{error:'provide ?number=<digits> (card, IMEI, etc.)'});
    const d=String(n).replace(/\D/g,'');
    if(d.length<2)return json(res,400,{error:'need at least 2 digits'});
    const actual=+d[d.length-1];
    const expected=luhnDigit(d.slice(0,-1));
    let type=null;
    if(d.length>=13&&d.length<=19){
      if(/^4/.test(d))type='Visa';
      else if(/^5[1-5]/.test(d)||/^2[2-7]/.test(d))type='Mastercard';
      else if(/^3[47]/.test(d))type='American Express';
      else if(/^6(?:011|5)/.test(d))type='Discover';
      else if(/^3(?:0[0-5]|[68])/.test(d))type='Diners Club';
      else if(/^35/.test(d))type='JCB';
      else if(d.length===15)type='possible IMEI/ISNI';
    }
    return json(res,200,{input:n,digits:d,valid:actual===expected,checkDigit:{actual,expected},cardType:type});
  }catch(e){return json(res,400,{error:'luhn failure: '+e.message});}
}
module.exports={routeLuhn};
