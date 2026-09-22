// Cron expression parser: /cron?expr=*/15 9-17 * * 1-5&count=5
// Standard 5-field cron. Returns parsed fields and next run times.
function parseCronField(field,min,max,name){
  const fieldOut=[];
  for(const part of field.split(',')){
    const m=part.trim().match(/^(\*|\d+(?:-\d+)?)(?:\/(\d+))?$/);
    if(!m)throw new Error('bad '+name+' field: '+part);
    let start,end,step=parseInt(m[2]||'1');
    if(m[1]==='*'){start=min;end=max;}
    else{
      const range=m[1].split('-');
      start=parseInt(range[0]);end=range.length>1?parseInt(range[1]):start;
    }
    if(start<min||end>max||start>end)throw new Error(name+' out of range: '+part);
    for(let v=start;v<=end;v+=step)if(!fieldOut.includes(v))fieldOut.push(v);
  }
  fieldOut.sort((a,b)=>a-b);
  return fieldOut;
}
function parseCron(expr){
  const parts=String(expr).trim().split(/\s+/);
  if(parts.length!==5)throw new Error('need exactly 5 fields (min hour dom month dow), got '+parts.length);
  const dowNames={sun:0,mon:1,tue:2,wed:3,thu:4,fri:5,sat:6};
  const monNames={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
  let norm=parts.slice();
  norm[4]=norm[4].replace(/(sun|mon|tue|wed|thu|fri|sat)/gi,m=>dowNames[m.toLowerCase()]);
  norm[3]=norm[3].replace(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/gi,m=>monNames[m.toLowerCase()]);
  const f={
    minute:parseCronField(norm[0],0,59,'minute'),
    hour:parseCronField(norm[1],0,23,'hour'),
    dom:parseCronField(norm[2],1,31,'day-of-month'),
    month:parseCronField(norm[3],1,12,'month'),
    dow:parseCronField(norm[4],0,7,'day-of-week'),
  };
  if(f.dow.includes(7)){if(!f.dow.includes(0))f.dow.push(0);f.dow=f.dow.filter(v=>v!==7).sort((a,b)=>a-b);}
  return f;
}
function nextRuns(f,count,from){
  const runs=[];
  let t=new Date(from);t.setMilliseconds(0);t.setSeconds(0);
  t=new Date(t.getTime()+60000); // start next minute
  const domStar=String(f.dom.length)!==''&&f.dom.length>=31;
  const dowStar=f.dow.length===7;
  while(runs.length<count&&t.getTime()-from<366*24*3600*1000){
    if(!f.month.includes(t.getMonth()+1)){t=new Date(t.getFullYear(),t.getMonth()+1,1,0,0);continue;}
    const domOK=f.dom.includes(t.getDate());
    const dowOK=f.dow.includes(t.getDay());
    // standard cron: if both dom and dow are restricted, match either; else match both
    const domRestricted=f.dom.length<31,dowRestricted=f.dow.length<7;
    const dayOK=(domRestricted&&dowRestricted)?(domOK||dowOK):(domOK&&dowOK);
    if(!dayOK){t=new Date(t.getFullYear(),t.getMonth(),t.getDate()+1,0,0);continue;}
    if(!f.hour.includes(t.getHours())){t.setMinutes(0);t.setHours(t.getHours()+1);continue;}
    if(!f.minute.includes(t.getMinutes())){t.setMinutes(t.getMinutes()+1);continue;}
    runs.push(new Date(t));
    t=new Date(t.getTime()+60000);
    // reset to next valid hour boundary is slow path; fine
  }
  return runs;
}
function routeCron(u,res,json,body){
  try{
    const expr=u.searchParams.get('expr')||(body&&body.expr);
    if(!expr)return json(res,400,{error:'provide ?expr="*/15 9-17 * * 1-5" (5-field cron)'});
    const count=Math.min(20,Math.max(1,parseInt(u.searchParams.get('count')||(body&&body.count))||5));
    const f=parseCron(expr);
    const fromStr=u.searchParams.get('from')||(body&&body.from);
    const from=fromStr?new Date(fromStr):new Date();
    if(isNaN(from))return json(res,400,{error:'invalid from date'});
    const runs=nextRuns(f,count,from.getTime());
    return json(res,200,{expression:expr,fields:f,
      nextRuns:runs.map(d=>d.toISOString()),
      humanHint:'runs when minute∈['+f.minute.slice(0,8).join(',')+(f.minute.length>8?'…':'')+'] etc.'});
  }catch(e){return json(res,400,{error:'cron failure: '+e.message});}
}
module.exports={routeCron,parseCron,nextRuns};
