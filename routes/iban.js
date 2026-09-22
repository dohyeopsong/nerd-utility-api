// IBAN validation: /iban?value=DE89370400440532013000
// Validates format, country length, mod-97 checksum (ISO 13616).
const LEN={AD:24,AE:23,AL:28,AT:20,AZ:28,BA:20,BE:16,BG:22,BH:22,BI:27,BR:29,BY:28,CH:21,CR:22,CY:28,
CZ:24,DE:22,DJ:27,DK:18,DO:28,EE:20,EG:29,ES:24,FI:18,FK:18,FO:18,FR:27,GB:22,GE:22,GI:23,GL:18,
GR:27,GT:28,HR:21,HU:28,IE:22,IL:23,IQ:23,IS:26,IT:27,JO:30,KW:30,KZ:20,LB:28,LC:32,LI:21,LT:20,
LU:20,LV:21,LY:25,MC:27,MD:24,ME:22,MK:19,MN:20,MR:27,MT:31,MU:30,NL:18,NO:15,OM:23,PK:24,PL:28,
PS:29,PT:25,QA:29,RO:24,RS:22,SA:24,SC:31,SD:18,SE:24,SI:19,SK:24,SM:27,SO:23,ST:25,SV:28,TL:23,
TN:24,TR:26,UA:29,VA:22,VG:24,XK:20};
function mod97(digits){
  let rem=0;
  for(const ch of digits){
    const v=parseInt(ch);
    rem=(rem*10+v)%97;
  }
  return rem;
}
function validateIBAN(raw){
  const s=String(raw||'').replace(/\s+/g,'').toUpperCase();
  const issues=[];
  if(!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s))issues.push('invalid characters or structure');
  const cc=s.slice(0,2);
  if(!LEN[cc])issues.push('unknown/unsupported country code: '+cc);
  else if(s.length!==LEN[cc])issues.push('length '+s.length+' != expected '+LEN[cc]+' for '+cc);
  // mod-97: move first 4 chars to end, convert letters to numbers, remainder must be 1
  let mod=0,valid=false;
  try{
    const rearranged=s.slice(4)+s.slice(0,4);
    for(const ch of rearranged){
      const code=ch.charCodeAt(0);
      const v=code>=65?code-55:code-48; // A=10..Z=35
      if(v<0||v>35)throw new Error('bad char');
      mod=(mod*(v>=10?100:10)+v)%97;
    }
    valid=mod===1;
    if(!valid&&issues.length===0)issues.push('mod-97 checksum failed (remainder '+mod+')');
  }catch(e){issues.push('cannot compute checksum: '+e.message);}
  return {iban:s,country:cc,expectedLength:LEN[cc]||null,valid:valid&&issues.length===0,issues};
}
function routeIban(u,res,json,body){
  try{
    const value=u.searchParams.get('value')||(body&&body.value)||u.searchParams.get('iban')||(body&&body.iban);
    if(!value)return json(res,400,{error:'provide ?value=<IBAN>'});
    return json(res,200,validateIBAN(value));
  }catch(e){return json(res,400,{error:'iban failure: '+e.message});}
}
module.exports={routeIban,validateIBAN};
