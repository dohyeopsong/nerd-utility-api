// TOTP (RFC 6238) utility: /totp?secret=<base32>&digits=6&period=30&time=<unix>
// Generates a time-based one-time passcode from a base32 secret (no server-side secret storage).
const crypto=require('crypto');
const B32='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
function base32Decode(s){
  s=String(s).toUpperCase().replace(/=+$/,'').replace(/\s+/g,'');
  let bits=0,val=0,out=Buffer.alloc(Math.floor(s.length*5/8)+1);
  let o=0;
  for(const c of s){
    const idx=B32.indexOf(c);
    if(idx<0)throw new Error('invalid base32 character: '+c);
    val=(val<<5)|idx;bits+=5;
    if(bits>=8){out[o++]=(val>>>(bits-8))&255;bits-=8;}
  }
  return out.slice(0,o);
}
function hotp(key,counter,digits){
  const buf=Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter/2**32),0);
  buf.writeUInt32BE(counter>>>0,4);
  const h=crypto.createHmac('sha1',key).update(buf).digest();
  const off=h[h.length-1]&0x0f;
  const code=((h[off]&0x7f)<<24|(h[off+1]&0xff)<<16|(h[off+2]&0xff)<<8|(h[off+3]&0xff))%10**digits;
  return String(code).padStart(digits,'0');
}
function totp(key,opts={}){
  const digits=opts.digits||6,period=opts.period||30;
  const time=opts.time||Math.floor(Date.now()/1000);
  const counter=Math.floor(time/period);
  return {code:hotp(key,counter,digits),counter,period,digits,expiresAt:(counter+1)*period,
    secondsRemaining:(counter+1)*period-time};
}
function routeTotp(u,res,json,body){
  try{
    const secret=u.searchParams.get('secret')||(body&&body.secret);
    if(!secret||!/^[A-Z2-7=\s]+$/i.test(secret))
      return json(res,400,{error:'provide ?secret=<base32 string> (RFC 4648, A-Z2-7)'});
    const digits=Math.min(10,Math.max(6,parseInt(u.searchParams.get('digits')||(body&&body.digits))||6));
    const period=Math.min(120,Math.max(5,parseInt(u.searchParams.get('period')||(body&&body.period))||30));
    const timeStr=u.searchParams.get('time')||(body&&body.time);
    const time=timeStr?parseInt(timeStr):Math.floor(Date.now()/1000);
    const key=base32Decode(secret);
    if(key.length===0)return json(res,400,{error:'empty secret after decode'});
    const r=totp(key,{digits,period,time});
    // also validate a supplied code
    const code=u.searchParams.get('code')||(body&&body.code);
    const out={...r};
    if(code){
      const drift=[-1,0,1];
      out.validation={code,valid:false};
      for(const d of drift){
        const t2=totp(key,{digits,period,time:time+d*period}).code;
        if(t2===String(code)){out.validation={code,valid:true,driftWindows:d};break;}
      }
    }
    return json(res,200,out);
  }catch(e){return json(res,400,{error:'totp failure: '+e.message});}
}
module.exports={routeTotp,base32Decode,totp};
