// Cron expression parser: /cron?expr=5 4 * * sun — next runs, human-readable description (5-field, no deps)
function parseField(f,min,max,alias){
  if(alias)for(const[k,v]of Object.entries(alias))f=f.replace(new RegExp('\\b'+k+'\\b','gi'),v);
  const vals=new Set();
  for(const part of f.split(',')){
    const[m,step]=part.split('/');
    let from=min,to=max;
    if(m==='*'){from=min;to=max;}
    else if(m.includes('-')){const[a,b]=m.split('-');from=+a;to=+b;}
    else{from=to=+m;}
    if(isNaN(from)||isNaN(to)||from<min||to>max||from>to)throw new Error(`field "${f}" out of range [${min}-${max}]`);
    const s=step===undefined?1:+step;
    if(isNaN(s)||s<1)throw new Error(`invalid step in "${part}"`);
    for(let v=from;v<=to;v+=s)vals.add(v);
  }
  return[...vals].sort((a,b)=>a-b);
}
const DOW=['sun','mon','tue','wed','thu','fri','sat'],MON=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
const DOW_AL={sun:0,mon:1,tue:2,wed:3,thu:4,fri:5,sat:6},MON_AL={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
function nextRuns(mins,hours,doms,months,dows,count){
  const runs=[];let d=new Date();
  d.setSeconds(0,0);d.setMinutes(d.getMinutes()+1);
  while(runs.length<count){
    if(d.getFullYear()>d.getFullYear()+5)break;
    if(!months.includes(d.getMonth()+1)){d=new Date(d.getFullYear(),d.getMonth()+1,1,0,0);continue;}
    if(!doms.includes(d.getDate())||!dows.includes(d.getDay())){d=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1,0,0);continue;}
    const hm=d.getHours()*60+d.getMinutes();
    const found=mins.find(m=>{const h=Math.floor(m/60);return hours.includes(h)&&(h*60+m%60)>=hm;});
    let hit=-1;
    for(const m of mins){const h=Math.floor(m/60),mm=m%60;if(hours.includes(h)&&h*60+mm>=hm){hit=m;break;}}
    if(hit>=0){d.setHours(Math.floor(hit/60),hit%60,0,0);runs.push(new Date(d));d=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1,0,0);continue;}
    d=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1,0,0);
  }
  return runs;
}
function human(mins,hours,doms,months,dows){
  const every=(arr,min,max)=>arr.length===max-min+1;
  let s=[];
  s.push(every(mins,0,59)?'every minute':(mins.length===1?`at minute ${mins[0]}`:`at minutes ${mins.join(',')}`));
  s.push(every(hours,0,23)?'every hour':(hours.length===1?`at hour ${hours[0]}`:`at hours ${hours.join(',')}`));
  if(!every(doms,1,31))s.push(`on day-of-month ${doms.join(',')}`);
  if(!every(months,1,12))s.push(`in ${months.map(m=>MON[m-1]).join(',')}`);
  if(!every(dows,0,6))s.push(`on ${dows.map(d=>DOW[d]).join(',')}`);
  return s.join(', ');
}
function routeCron(u,res,json,body){
  try{
    let expr=u.searchParams.get('expr')||u.searchParams.get('c')||u.searchParams.get('cron');
    if(!expr&&body&&typeof body==='object'&&(body.expr||body.cron||body.expression))expr=body.expr||body.cron||body.expression;
    if(!expr)return json(res,400,{error:'provide ?expr=<5-field cron> e.g. 5 4 * * sun'});
    const f=expr.trim().split(/\s+/);
    if(f.length!==5)return json(res,400,{error:'expected 5 fields (min hour dom month dow), got '+f.length});
    const mins=parseField(f[0],0,59),hours=parseField(f[1],0,23),doms=parseField(f[2],1,31),months=parseField(f[3],1,12,MON_AL),dows=parseField(f[4],0,6,DOW_AL);
    const runs=nextRuns(mins,hours,doms,months,dows,5);
    return json(res,200,{expression:expr.trim(),description:human(mins,hours,doms,months,dows),fields:{minutes:mins,hours,daysOfMonth:doms,months,daysOfWeek:dows},nextRuns:runs.map(r=>r.toISOString())});
  }catch(e){return json(res,400,{error:'cron failure: '+e.message});}
}
module.exports={routeCron};
