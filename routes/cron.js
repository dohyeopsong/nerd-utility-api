// Cron parser: /cron?expr=...&count=5&from=<ISO> — next run times, human description
function parseField(field,min,max){
  if(field==='*')return {type:'*'};
  const list=field.split(',');
  const vals=new Set();
  for(const part of list){
    const stepM=part.match(/^(\*|\d+-\d+)\/(\d+)$/);
    if(stepM){
      const step=+stepM[2];
      let lo=min,hi=max;
      if(stepM[1]!=='*'){const r=stepM[1].split('-').map(Number);lo=r[0];hi=r[1];}
      for(let i=lo;i<=hi;i+=step)vals.add(i);
      continue;
    }
    const rangeM=part.match(/^(\d+)-(\d+)$/);
    if(rangeM){for(let i=+rangeM[1];i<=+rangeM[2];i++)vals.add(i);continue;}
    if(/^\d+$/.test(part)){vals.add(+part);continue;}
    throw new Error('invalid field value: '+part);
  }
  return {type:'set',values:[...vals].sort((a,b)=>a-b)};
}
function nextRuns(expr,from,count){
  const f=expr.trim().split(/\s+/);
  if(f.length!==5)throw new Error('need 5 fields: min hour dom month dow');
  const minute=parseField(f[0],0,59);
  const hour=parseField(f[1],0,23);
  const dom=parseField(f[2],1,31);
  const month=parseField(f[3],1,12);
  const dow=parseField(f[4],0,7);
  const ok=(spec,v,extra)=>{
    if(spec.type==='*')return true;
    let vv=v;if(extra&&vv===7)vv=0;
    return spec.values.includes(vv);
  };
  const runs=[];
  const d=new Date(from);
  d.setSeconds(0,0);
  d.setMinutes(d.getMinutes()+1);
  for(let i=0;i<500000&&runs.length<count;d.setMinutes(d.getMinutes()+1)){
    i++;
    if(!ok(month,d.getMonth()+1))continue;
    const dayOk=ok(dom,d.getDate());
    const dowOk=ok(dow,d.getDay());
    // standard cron: if both dom and dow are restricted, match either
    let dayMatch;
    if(dom.type!=='*'&&dow.type!=='*')dayMatch=dayOk||dowOk;
    else dayMatch=dayOk&&dowOk;
    if(!dayMatch)continue;
    if(!ok(hour,d.getHours()))continue;
    if(!ok(minute,d.getMinutes()))continue;
    runs.push(new Date(d));
  }
  return runs;
}
function describe(expr){
  const f=expr.trim().split(/\s+/);
  if(f.join(' ')==='* * * * *')return 'every minute';
  if(f[0]==='*'&&f[1]==='*')return 'every minute of every hour';
  if(f[1]==='*')return `at minute ${f[0]} of every hour`;
  if(f[0]==='0'&&f[1]==='*')return 'hourly';
  return `minute ${f[0]} hour ${f[1]}, dom ${f[2]}, month ${f[3]}, dow ${f[4]}`;
}
function routeCron(u,res,json){
  try{
    const expr=u.searchParams.get('expr');
    if(!expr)return json(res,400,{error:'provide ?expr=<cron> (min hour dom month dow)'});
    const count=Math.min(+(u.searchParams.get('count')||5),50);
    const fromStr=u.searchParams.get('from');
    const from=fromStr?new Date(fromStr):new Date();
    if(isNaN(from))return json(res,400,{error:'invalid from date'});
    let runs;
    try{
      runs=nextRuns(expr,from,count);
    }catch(e){return json(res,400,{error:e.message});}
    if(runs.length===0)return json(res,400,{error:'no matching times found in search window'});
    return json(res,200,{expression:expr,description:describe(expr),count:runs.length,nextRuns:runs.map(r=>r.toISOString())});
  }catch(e){return json(res,500,{error:'cron failure: '+e.message});}
}
module.exports={routeCron,nextRuns};
