// Cron expression parser: /cron?expr=0 9 * * 1-5&count=3
const MONTH_NAMES={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
const DOW_NAMES={sun:0,mon:1,tue:2,wed:3,thu:4,fri:5,sat:6};
function parseField(f,min,max,names){
  if(f==='*')return Array.from({length:max-min+1},(_,i)=>min+i);
  const num=x=>{const k=names?names[String(x).toLowerCase()]:undefined;return k!==undefined?k:parseInt(x,10);};
  const out=new Set();
  for(const part of f.split(',')){
    let step=1,range=part;
    const sm=part.match(/^([^/]+)\/(\d+)$/);
    if(sm){range=sm[1];step=parseInt(sm[2],10);if(!step)return null;}
    let a,b;
    if(range==='*'){a=min;b=max;}
    else if(range.includes('-')){const p=range.split('-');a=num(p[0]);b=num(p[1]);}
    else{a=b=num(range);}
    if(isNaN(a)||isNaN(b)||a<min||b>max||b<a||step<1)return null;
    for(let i=a;i<=b;i+=step)out.add(i);
  }
  const arr=[...out].sort((x,y)=>x-y);
  return arr.length?arr:null;
}
function nextRun(fields,after){
  const d=new Date(after.getTime());
  d.setSeconds(0,0);
  d.setMinutes(d.getMinutes()+1);
  const[mins,hours,doms,months,dows]=fields;
  for(let i=0;i<525960;i++){
    if(months.includes(d.getMonth()+1)&&doms.includes(d.getDate())&&dows.includes(d.getDay())&&hours.includes(d.getHours())&&mins.includes(d.getMinutes()))
      return new Date(d.getTime());
    d.setMinutes(d.getMinutes()+1);
  }
  return null;
}
function routeCron(u,res,json){
  try{
    const expr=(u.searchParams.get('expr')||'').trim();
    if(!expr)return json(res,400,{error:'provide ?expr=<cron expression>'});
    const parts=expr.split(/\s+/);
    if(parts.length<5||parts.length>6)return json(res,400,{error:'expected 5 or 6 fields (m h dom mon dow [year])'});
    const m0=parseField(parts[0],0,59),h1=parseField(parts[1],0,23),
          d2=parseField(parts[2],1,31),
          mo=parseField(parts[3],1,12,MONTH_NAMES),
          dw=parseField(parts[4],0,7,DOW_NAMES);
    if([m0,h1,d2,mo,dw].some(f=>f===null))return json(res,400,{error:'invalid field(s): '+expr});
    const dowSet=new Set(dw.map(x=>x%7));
    const F=[m0,h1,d2,mo,[...dowSet].sort((x,y)=>x-y)];
    const count=Math.min(parseInt(u.searchParams.get('count')||'3',10)||3,10);
    const runs=[];let t=new Date();
    for(let i=0;i<count;i++){const n=nextRun(F,t);if(!n)break;runs.push(n.toISOString());t=n;}
    const desc=`minute=${m0.length===60?'every':m0.join(',')} hour=${h1.length===24?'every':h1.join(',')} dom=${d2.length===31?'every':d2.join(',')} month=${mo.length===12?'every':mo.join(',')} dow=${F[4].length===7?'every':F[4].join(',')}`;
    return json(res,200,{expr,valid:true,description:desc,nextRuns:runs,timezone:'UTC'});
  }catch(e){return json(res,500,{error:'cron failure: '+e.message});}
}
module.exports={routeCron,nextRun,parseField};
