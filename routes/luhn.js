// Luhn algorithm validator: /luhn?number=4532015112830366
// Returns validity, check digit computation, and the full digit breakdown.
function routeLuhn(u,res,json,body){
  try{
    const raw=u.searchParams.get('number')||(body&&body.number);
    if(!raw)return json(res,400,{error:'provide ?number=<digits>'});
    const s=String(raw).replace(/[\s-]/g,'');
    if(!/^\d{2,}$/.test(s))return json(res,400,{error:'number must be 2+ digits (spaces/dashes allowed)'});
    const digits=s.split('').map(Number);
    const luhnCheck=(arr)=>{
      let sum=0;
      for(let i=arr.length-1,dbl=false;i>=0;i--,dbl=!dbl){
        let d=arr[i];
        if(dbl){d*=2;if(d>9)d-=9;}
        sum+=d;
      }
      return sum%10===0;
    };
    const valid=luhnCheck(digits);
    // what check digit WOULD be valid for the prefix?
    const prefix=digits.slice(0,-1);
    let cd=null;
    for(let i=0;i<10;i++){if(luhnCheck([...prefix,i])){cd=i;break;}}
    return json(res,200,{
      number:s,
      length:digits.length,
      valid,
      providedCheckDigit:digits[digits.length-1],
      expectedCheckDigit:cd,
      sumTotal:(()=>{let sum=0;for(let i=digits.length-1,dbl=false;i>=0;i--,dbl=!dbl){let d=digits[i];if(dbl){d*=2;if(d>9)d-=9;}sum+=d;}return sum;})(),
    });
  }catch(e){return json(res,400,{error:'luhn failure: '+e.message});}
}
module.exports={routeLuhn};
