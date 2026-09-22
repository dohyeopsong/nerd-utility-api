// ISBN validator: /isbn?code=978-3-16-148410-0 — ISBN-10/13 validation with check digit computation
function cleanIsbn(s){return String(s).replace(/[^0-9Xx]/g,'').toUpperCase();}
function isbn10Check(d){ // d: 9 digits -> expected check char
  let sum=0;
  for(let i=0;i<9;i++)sum+=(10-i)*(+d[i]);
  const rem=(11-(sum%11))%11;
  return rem===10?'X':String(rem);
}
function isbn13Check(d){ // d: 12 digits -> expected check digit
  let sum=0;
  for(let i=0;i<12;i++)sum+=(i%2===0?1:3)*(+d[i]);
  return String((10-(sum%10))%10);
}
function routeIsbn(u,res,json,body){
  try{
    let code=u.searchParams.get('isbn')||u.searchParams.get('code')||u.searchParams.get('i');
    if(!code&&body&&typeof body==='object'&&(body.isbn||body.code))code=body.isbn||body.code;
    if(!code)return json(res,400,{error:'provide ?isbn=<ISBN-10 or ISBN-13>'});
    const d=cleanIsbn(code);
    if(d.length===10){
      const expected=isbn10Check(d.slice(0,9));
      const actual=d[9];
      return json(res,200,{input:code,type:'ISBN-10',digits:d,valid:actual===expected,checkDigit:{actual,expected},isbn13:d.startsWith('978')||d.startsWith('979')?undefined:undefined});
    }
    if(d.length===13){
      const expected=isbn13Check(d.slice(0,12));
      const actual=d[12];
      let ean=null;
      if(d.startsWith('978')||d.startsWith('979'))ean='bookland (978/979 prefix)';
      return json(res,200,{input:code,type:'ISBN-13',digits:d,valid:actual===expected,checkDigit:{actual,expected},prefix:ean});
    }
    return json(res,400,{error:`expected 10 or 13 digits after cleaning, got ${d.length}`});
  }catch(e){return json(res,400,{error:'isbn failure: '+e.message});}
}
module.exports={routeIsbn};
