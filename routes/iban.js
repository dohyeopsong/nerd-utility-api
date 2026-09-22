// IBAN validator: /iban?iban=DE89370400440532013000 — mod-97 checksum, country length checks, BBAN structure
const COUNTRY_LENGTH={AD:24,AE:23,AL:28,AT:20,AZ:28,BA:20,BE:16,BG:22,BH:22,BI:27,BR:29,BY:28,CH:21,CR:22,CY:28,CZ:24,DE:22,DJ:27,DK:18,DO:28,EE:20,EG:29,ES:24,FI:18,FK:18,FO:18,FR:27,GB:22,GE:22,GI:23,GL:18,GR:27,HR:21,HU:28,IE:22,IL:23,IQ:23,IS:26,IT:27,JO:30,KW:30,KZ:20,LB:28,LC:32,LI:21,LT:20,LU:20,LV:21,LY:25,MC:27,MD:24,ME:22,MK:19,MN:20,MR:27,MT:31,MU:30,NL:18,NO:15,OM:23,PK:24,PL:28,PS:29,PT:25,QA:29,RO:24,RS:22,SA:24,SC:31,SD:18,SE:24,SI:19,SK:24,SM:27,SO:23,ST:25,SV:28,TL:23,TN:24,TR:26,UA:29,VA:22,VG:24,XK:20};
function ibanMod97(iban){
  // move first 4 chars to end, convert letters to numbers, compute mod 97
  const s=iban.slice(4)+iban.slice(0,4);
  let rem=0;
  for(const ch of s){
    const code=ch.charCodeAt(0);
    let v;
    if(code>=48&&code<=57)v=ch;               // digit
    else if(code>=65&&code<=90)v=String(code-55); // A=10..Z=35
    else return null;
    for(const d of v)rem=(rem*10+ +d)%97;
  }
  return rem;
}
function routeIban(u,res,json,body){
  try{
    let iban=u.searchParams.get('iban')||u.searchParams.get('number');
    if(!iban&&body&&typeof body==='object'&&(body.iban||body.number))iban=body.iban||body.number;
    if(!iban)return json(res,400,{error:'provide ?iban=<IBAN>'});
    const raw=iban;
    iban=iban.replace(/\s+/g,'').toUpperCase();
    const out={input:raw,clean:iban};
    // basic structure
    if(!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)){
      return json(res,200,{...out,valid:false,reason:'format: must be 2 letters + 2 check digits + 10-30 alphanumeric'});
    }
    const cc=iban.slice(0,2);
    out.country=cc;
    const expected=COUNTRY_LENGTH[cc];
    if(!expected)return json(res,200,{...out,valid:false,reason:`unknown/unsupported country code "${cc}"`});
    out.expectedLength=expected;
    if(iban.length!==expected)return json(res,200,{...out,valid:false,reason:`length: got ${iban.length}, expected ${expected} for ${cc}`});
    // mod 97
    const rem=ibanMod97(iban);
    if(rem===null)return json(res,200,{...out,valid:false,reason:'invalid character in IBAN'});
    out.checkDigits=iban.slice(2,4);
    if(rem!==1)return json(res,200,{...out,valid:false,reason:`checksum: mod-97 result ${rem}, expected 1`});
    // friendly formatting: groups of 4
    out.formatted=iban.replace(/(.{4})/g,'$1 ').trim();
    return json(res,200,{...out,valid:true,bban:iban.slice(4)});
  }catch(e){return json(res,400,{error:'iban failure: '+e.message});}
}
module.exports={routeIban};
