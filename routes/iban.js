// IBAN validator: /iban?iban=DE89... — structure, mod-97 checksum, country length, formatted, BBAN
const COUNTRY_LEN={AD:24,AE:23,AL:28,AT:20,AZ:28,BA:20,BE:16,BG:22,BH:22,BI:27,BR:29,BY:28,CH:21,CR:22,CY:28,CZ:24,DE:22,DJ:27,DK:18,DO:28,EE:20,EG:29,ES:24,FI:18,FK:18,FO:18,FR:27,GB:22,GE:22,GI:23,GL:18,GR:27,GT:28,HR:21,HU:28,IE:22,IL:23,IQ:23,IS:26,IT:27,JO:30,KW:30,KZ:20,LB:28,LC:32,LI:21,LT:20,LU:20,LV:21,LY:25,MC:27,MD:24,ME:22,MK:19,MN:20,MR:27,MT:31,MU:30,NL:18,NO:15,OM:23,PK:24,PL:28,PS:29,PT:25,QA:29,RO:24,RS:22,RU:33,SA:24,SC:31,SD:18,SE:24,SI:19,SK:24,SM:27,ST:25,SV:28,TL:23,TN:24,TR:26,UA:29,VA:22,VG:24,XK:20};
function routeIban(u,res,json,body){
  try{
    let iban=(u.searchParams.get('iban')||(body&&body.iban)||'').replace(/\s+/g,'');
    if(!iban)return json(res,400,{error:'provide ?iban=<IBAN>'});
    const up=iban.toUpperCase();
    const out={iban:up,length:up.length};
    const checks={};
    // format
    checks.format=/^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/.test(up);
    // country
    const cc=up.slice(0,2);
    const expectedLen=COUNTRY_LEN[cc];
    out.country=cc;
    out.knownCountry=expectedLen!==undefined;
    if(expectedLen!==undefined)checks.countryLength=up.length===expectedLen;
    // mod-97
    if(checks.format){
      const rearr=up.slice(4)+up.slice(0,4);
      const num=rearr.replace(/[A-Z]/g,c=>String(c.charCodeAt(0)-55));
      let rem=0;
      for(const d of num)rem=(rem*10+ +d)%97;
      checks.mod97=rem===1;
      out.checkDigits=up.slice(2,4);
      out.bban=up.slice(4);
    }
    out.valid=checks.format&&checks.mod97!==false&&checks.countryLength!==false;
    out.checks=checks;
    out.formatted=up.replace(/(.{4})/g,'$1 ').trim();
    return json(res,200,out);
  }catch(e){return json(res,400,{error:'iban failure: '+e.message});}
}
module.exports={routeIban};
