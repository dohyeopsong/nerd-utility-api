// Cron expression parser: /cron?expr=0 9 * * 1-5&count=3 — parse, describe, and preview next runs
const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DOWS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
function parseField(f,min,max,names){
  // returns sorted array of allowed values, or null if invalid
  if(f==='*')return Array.from({length:max-min+1},(_,i)=>min+i);
  const out=new Set();
  for(const part of f.split(',')){
    const m=part.match(/^(?:(\d+|[a-z]+)(?:-(\d+|[a-z]+))?)\/(\d+)$|^(?:(\d+|[a-z]+)-(?:\d+|[a-z]+))|^(?:\*\/(\d+))$|^(\d+|[a-z]+)$/i);
    if(!m)return null;
    const num=x=>names&&names[x.toLowerCase()]!==undefined?names[x.toLowerCase()]:parseInt(x,10);
    if(m[3]&&m[1]){ // step: a/b or a-b/s
      let s=parseInt(m[3],10);if(!s)return null;
      let a=m[2]?num(m[1]):min,b=m[2]?num(m[2]):min;
      if(m[2]&&num(m[2])<num(m[1]))return null;
      for(let i=a;i<=b;i+=s)out.add(i);
    }else if(m[4]){ // range
      let a=num(m[4].split('-')[0]),b=parseInt(m[4].split('-')[1],10);
      if(names)a=names[m[4].split('-')[0].toLowerCase()]!==undefined?names[m[4].split('-')[0].toLowerCase()]:parseInt(m[4].split('-')[0],10),b=names[m[4].split('-')[1].toLowerCase()]!==undefined?names[m[4].split('-')[1].toLowerCase()]:parseInt(m[4].split('-')[1],10);
      if(isNaN(a)||isNaN(b)||b<a)return null;
      for(let i=a;i<=b;i++)out.add(i);
    }else if(m[5]){ // */n
      let s=parseInt(m[5],10);if(!s)return null;
      for(let i=min;i<=max;i+=s)out.add(i);
    }else if(m[6]){ // single
      const v=num(m[6]);if(isNaN(v)||v<min||v>max)return null;out.add(v);
    }else return null;
  }
  const arr=[...out].sort((a,b)=>a-b);
  return arr.length&&arr[0]>=min&&arr[arr.length-1]<=max?arr:null;
}
function nextRun(fields,after){
  // brute-force minute stepping, max 1 year ahead
  const d=new Date(after.getTime());d.setSeconds(0,0);d.setMinutes(d.getMinutes()+1);
  const[mins,hours,doms,months,dows]=fields;
  for(let i=0;i<525960;i++){
    if(months.includes(d.getMonth()+1)&&doms.includes(d.getDate())&&dows.includes(d.getDay())&&hours.includes(d.getHours())&&mins.includes(d.getMinutes()))
      return new Date(d);
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
    const F=[parseField(parts[0],0,59),parseField(parts[1],0,23),parseField(parts[2],1,31),parseField(parts[3],1,12),parseField(parts[4],0,7).map(x=>x%7)];
    if(F.some(f=>f===null))return json(res,400,{error:'invalid field(s): '+expr});
    const count=Math.min(parseInt(u.searchParams.get('count')||'3',10)||3,10);
    const runs=[];let t=new Date();
    for(let i=0;i<count;i++){const n=nextRun(F,t);if(!n)break;runs.push(n.toISOString());t=n;}
    const desc=`minute=${F[0].length===60?'every':F[0].join(',')} hour=${F[1].length===24?'every':F[1].join(',')} dom=${F[2].length===31?'every':F[2].join(',')} month=${F[3].length===12?'every':F[3].join(',')} dow=${F[4].length===7?'every':F[4].join(',')}`;
    return json(res,200,{expr,valid:true,description:desc,nextRuns:runs,timezone:'UTC'});
  }catch(e){return json(res,500,{error:'cron failure: '+e.message});}
}
module.exports={routeCron};
