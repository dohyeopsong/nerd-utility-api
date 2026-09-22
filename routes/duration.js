// Duration utility: /duration?input=1h30m  or ISO 8601 P1DT2H10M
// Parses human ("2d 4h 30m 15s" / "1w") and ISO 8601 durations; formats back.
const UNITS={ms:1,s:1000,m:60000,h:3600000,d:86400000,w:604800000,y:31536000000};
function parseHuman(s){
  const re=/(\d+(?:\.\d+)?)\s*(ms|s|sec|secs|m|min|mins|h|hr|hrs|d|day|days|w|wk|wks|y|yr|yrs)\b/gi;
  let total=0,m,hit=false;
  while((m=re.exec(s))){hit=true;const v=parseFloat(m[1]);
    let u=m[2].toLowerCase();
    if(u==='ms')u='ms';else if(u==='s'||u==='sec'||u==='secs')u='s';
    else if(u==='m'||u==='min'||u==='mins')u='m';
    else if(u==='h'||u==='hr'||u==='hrs')u='h';
    else if(u==='d'||u==='day'||u==='days')u='d';
    else if(u==='w'||u==='wk'||u==='wks')u='w';
    else if(u==='y'||u==='yr'||u==='yrs')u='y';
    if(!(u in UNITS))throw new Error('unknown unit: '+m[2]);
    total+=v*UNITS[u];}
  if(!hit)throw new Error('no duration tokens found');
  return total;
}
function parseISO(s){
  const m=s.match(/^P(?:(\d+(?:\.\d+)?)Y)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)W)?(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/);
  if(!m)throw new Error('invalid ISO 8601 duration');
  const [y,mo,w,d,h,mi,se]=m.slice(1).map(x=>x?parseFloat(x):0);
  return y*UNITS.y+mo*2592000000+w*UNITS.w+d*UNITS.d+h*UNITS.h+mi*UNITS.m+se*UNITS.s;
}
function fmt(ms){
  const parts=[];
  const steps=[['y',UNITS.y],['w',UNITS.w],['d',UNITS.d],['h',UNITS.h],['m',UNITS.m],['s',UNITS.s],['ms',UNITS.ms]];
  let rest=ms;
  for(const [n,v] of steps){const q=Math.floor(rest/v);if(q>0){parts.push(q+n);rest-=q*v;}}
  return parts.join(' ')||'0ms';
}
function routeDuration(u,res,json,body){
  try{
    const input=u.searchParams.get('input')||(body&&body.input);
    if(!input)return json(res,400,{error:'provide ?input=1h30m or ?input=P1DT2H'});
    const s=String(input).trim();
    let ms,mode;
    if(/^P/i.test(s)){ms=parseISO(s);mode='iso8601';}
    else if(/^\d+$/.test(s)){ms=parseInt(s)*1000;mode='seconds';}
    else{ms=parseHuman(s);mode='human';}
    if(!isFinite(ms)||ms<0)return json(res,400,{error:'duration out of range'});
    return json(res,200,{input:s,mode,milliseconds:ms,
      seconds:+(ms/1000).toFixed(3),minutes:+(ms/60000).toFixed(3),hours:+(ms/3600000).toFixed(4),
      days:+(ms/86400000).toFixed(5),human:fmt(ms)});
  }catch(e){return json(res,400,{error:'duration failure: '+e.message});}
}
module.exports={routeDuration,parseHuman,parseISO,fmtDuration:fmt};
