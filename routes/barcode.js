// EAN-13/UPC-A barcode parser: /barcode?code=4006381333931 — validate check digit, split company prefix
function routeBarcode(u,res,json,body){
  try{
    let code=u.searchParams.get('code')||u.searchParams.get('barcode')||u.searchParams.get('b');
    if(!code&&body&&typeof body==='object'&&(body.code||body.barcode))code=body.code||body.barcode;
    if(!code)return json(res,400,{error:'provide ?code=<EAN-13 or UPC-A digits>'});
    const d=String(code).replace(/\D/g,'');
    if(d.length===12){ // UPC-A -> EAN-13 by prepending 0
      const ean='0'+d.slice(0,11);
      const expected=(10-([...'0'+d.slice(0,11)].reduce((s,c,i)=>s+(i%2===0?3:1)*+c,0)%10))%10;
      return json(res,200,{input:code,normalized:'0'+d,type:'UPC-A (as EAN-13)',digits:'0'+d,valid:+d[11]===expected,checkDigit:{actual:+d[11],expected}});
    }
    if(d.length!==13)return json(res,400,{error:`expected 12 (UPC-A) or 13 (EAN-13) digits, got ${d.length}`});
    let sum=0;
    for(let i=0;i<12;i++)sum+=(i%2===0?1:3)*(+d[i]);
    const expected=(10-(sum%10))%10;
    const gs1=d.slice(0,3);
    return json(res,200,{input:code,type:'EAN-13',digits:d,valid:+d[12]===expected,checkDigit:{actual:+d[12],expected},gs1Prefix:gs1,isBookland:gs1==='978'||gs1==='979'});
  }catch(e){return json(res,400,{error:'barcode failure: '+e.message});}
}
module.exports={routeBarcode};
