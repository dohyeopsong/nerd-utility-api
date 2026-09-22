// Color converter: /color?hex=%23ff6600 or ?r=255&g=102&b=0 — hex/rgb/hsl/hsv conversions + shades
function hexToRgb(hex){
  let h=hex.replace('#','').trim();
  if(h.length===3)h=h.split('').map(c=>c+c).join('');
  if(!/^[0-9a-fA-F]{6}$/.test(h))throw new Error(`invalid hex "${hex}"`);
  const n=parseInt(h,16);
  return{r:(n>>16)&255,g:(n>>8)&255,b:n&255};
}
function rgbToHsl(r,g,b){
  r/=255;g/=255;b/=255;
  const max=Math.max(r,g,b),min=Math.min(r,g,b);
  let h=0,s=0;const l=(max+min)/2;
  if(max!==min){
    const d=max-min;
    s=l>0.5?d/(2-max-min):d/(max+min);
    if(max===r)h=((g-b)/d+(g<b?6:0));
    else if(max===g)h=((b-r)/d+2);
    else h=((r-g)/d+4);
    h*=60;
  }
  return{h:Math.round(h),s:Math.round(s*100),l:Math.round(l*100)};
}
function rgbToHsv(r,g,b){
  r/=255;g/=255;b/=255;
  const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;
  let h=0;
  if(d!==0){
    if(max===r)h=((g-b)/d+(g<b?6:0));
    else if(max===g)h=((b-r)/d+2);
    else h=((r-g)/d+4);
    h*=60;
  }
  return{h:Math.round(h),s:Math.round((max===0?0:d/max)*100),v:Math.round(max*100)};
}
function luminance(r,g,b){
  const a=[r,g,b].map(v=>{v/=255;return v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4;});
  return 0.2126*a[0]+0.7152*a[1]+0.0722*a[2];
}
function toHex(r,g,b){return '#'+[r,g,b].map(v=>Math.round(Math.max(0,Math.min(255,v))).toString(16).padStart(2,'0')).join('');}
function routeColor(u,res,json,body){
  try{
    let hex=u.searchParams.get('hex')||u.searchParams.get('c');
    let r=u.searchParams.get('r'),g=u.searchParams.get('g'),b=u.searchParams.get('b');
    if(!hex&&body&&typeof body==='object'&&(body.hex||body.c))hex=body.hex||body.c;
    let rgb;
    if(hex)rgb=hexToRgb(hex);
    else if(r!==null&&g!==null&&b!==null){
      rgb={r:+r,g:+g,b:+b};
      if([rgb.r,rgb.g,rgb.b].some(v=>isNaN(v)||v<0||v>255))throw new Error('r,g,b must be 0-255');
    }else return json(res,400,{error:'provide ?hex=<#rrggbb> or ?r=&g=&b='});
    const{r:R,g:G,b:B}=rgb;
    const hsl=rgbToHsl(R,G,B),hsv=rgbToHsv(R,G,B);
    const L1=luminance(R,G,B);
    const Lb=luminance(255,255,255),Lk=luminance(0,0,0);
    const crW=(Math.max(L1,Lb)+0.05)/(Math.min(L1,Lb)+0.05);
    const crB=(Math.max(L1,Lk)+0.05)/(Math.min(L1,Lk)+0.05);
    const cm=Math.max(crW,crB);
    return json(res,200,{
      hex:toHex(R,G,B),rgb:{r:R,g:G,b:B},hsl,hsv,
      luminance:+L1.toFixed(4),
      contrast:{vsWhite:+crW.toFixed(2),vsBlack:+crB.toFixed(2),best:crW>=crB?'white':'black',wcagAA:cm>=4.5,wcagAAA:cm>=7},
      shades:{lighter:[10,25,40].map(p=>toHex(R+(255-R)*p/100,G+(255-G)*p/100,B+(255-B)*p/100)),darker:[10,25,40].map(p=>toHex(R*(1-p/100),G*(1-p/100),B*(1-p/100)))},
      cssVar:`--color: ${toHex(R,G,B)};`
    });
  }catch(e){return json(res,400,{error:'color failure: '+e.message});}
}
module.exports={routeColor};
