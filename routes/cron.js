// Cron expression explainer: /cron?expr=0 9 * * MON-FRI
// Supports 5-field cron, *, */n, ranges, lists, step ranges, names for months/days.
const MONTHS=['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const DOWS=['SUN','MON','TUE','WED','THU','FRI','SAT'];
function normName(v,names){
  const i=names.indexOf(String(v).toUpperCase());
  return i<0?parseInt(v):i+(names===MONTHS?1:0);
}
function parseField(field,min,max,names,unit){
  if(!field)return null;
  const parts=field.split(',');
  const out=[];
  for(const p of parts){
    let step=1,range=p;
    const sm=p.match(/^(.+?)\/(\d+)$/);
    if(sm){range=sm[1];step=parseInt(sm[2]);if(step<1)return null;}
    let a,b;
    if(range==='*'){a=min;b=max;}
    else{
      const rm=range.match(/^([A-Za-z0-9]+)-([A-Za-z0-9]+)$/);
      if(rm){a=names?normName(rm[1],names):parseInt(rm[1]);b=names?normName(rm[2],names):parseInt(rm[2]);}
      else{a=names?normName(range,names):parseInt(range);b=a;}
      if(a===null||b===null||isNaN(a)||isNaN(b))return null;
    }
    if(a<min||b>max||a>b)return null;
    if(range==='*'&&step===1){out.push({type:'every',desc:'every '+unit});continue;}
    if(range==='*'&&step>1){out.push({type:'every-n',n:step,desc:`every ${step} ${unit}s`});continue;}
    if(a===b)out.push({type:'single',v:a,desc:String(a)});
    else if(step>1)out.push({type:'range-step',from:a,to:b,step,desc:`${a} through ${b} every ${step}`});
    else out.push({type:'range',from:a,to:b,desc:`${a} to ${b}`});
  }
  return out;
}
function routeCron(u,res,json,body){
  try{
    const expr=u.searchParams.get('expr')||(body&&body.expr);
    if(!expr)return json(res,400,{error:'provide ?expr="m h dom mon dow"'});
    const f=expr.trim().split(/\s+/);
    if(f.length!==5)return json(res,400,{error:'cron must have exactly 5 fields: minute hour day-of-month month day-of-week'});
    const fields=[
      {name:'minute',min:0,max:59,parts:parseField(f[0],0,59,null,'minute')},
      {name:'hour',min:0,max:23,parts:parseField(f[1],0,23,null,'hour')},
      {name:'day-of-month',min:1,max:31,parts:parseField(f[2],1,31,null,'day-of-month')},
      {name:'month',min:1,max:12,parts:parseField(f[3],1,12,MONTHS,'month')},
      {name:'day-of-week',min:0,max:7,parts:parseField(f[4],0,7,DOWS,'day-of-week')},
    ];
    for(let i=0;i<fields.length;i++){
      if(!fields[i].parts)return json(res,400,{error:`invalid ${fields[i].name} field: "${f[i]}"`});
    }
    const [minute,hour,dom,mon,dow]=fields;
    let desc='';
    const allStars=fs=>fs.parts.every(p=>p.type==='every');
    const descOf=fs=>fs.parts.map(p=>p.desc).join(', ');
    if(minute.parts.length===1&&minute.parts[0].type==='single'&&hour.parts.length===1&&hour.parts[0].type==='single')
      desc=`At ${hour.parts[0].v}:${String(minute.parts[0].v).padStart(2,'0')} `;
    else if(minute.parts.length===1&&minute.parts[0].type==='every-n'&&hour.parts.length===1&&hour.parts[0].type==='single')
      desc=`Every ${minute.parts[0].n} minutes past hour ${hour.parts[0].v} `;
    else if(allStars(minute)&&allStars(hour))
      desc=`Every minute `;
    else desc=`Minutes: ${descOf(minute)}, Hours: ${descOf(hour)} `;
    if(!allStars(dom)||!allStars(mon)||!allStars(dow)){
      desc+= allStars(dom)?'':`on day ${descOf(dom)} of the month `;
      desc+= allStars(mon)?'':`in month${mon.parts.length>1?'s':''} ${descOf(mon)} `;
      desc+= allStars(dow)?'':`on ${descOf(dow)} `;
    }
    return json(res,200,{
      expr:expr.trim(),
      fields:f,
      parsed:fields.map(x=>({name:x.name,parts:x.parts})),
      description:desc.trim(),
      nextRuns:nextRuns(fields),
    });
  }catch(e){return json(res,400,{error:'cron failure: '+e.message});}
}
function nextRuns(fields){
  const out=[];let d=new Date();d.setSeconds(0,0);d.setMinutes(d.getMinutes()+1);
  const ok=(fd,v)=>fd.parts.some(p=>{
    if(p.type==='every')return true;
    if(p.type==='single')return p.v===v||(fd.name==='day-of-week'&&p.v===7&&v===0);
    if(p.type==='range'||p.type==='range-step'){
      if(v<p.from||v>p.to)return false;
      if(p.type==='range-step')return (v-p.from)%p.step===0;
      return true;
    }
    if(p.type==='every-n')return v%p.n===0;
    return false;
  });
  for(let i=0;i<20000&&out.length<3;i++){
    const dt=new Date(d.getTime()+i*60000);
    if(ok(fields[0],dt.getMinutes())&&ok(fields[1],dt.getHours())&&ok(fields[2],dt.getDate())&&ok(fields[3],dt.getMonth()+1)&&ok(fields[4],dt.getDay()))
      out.push(dt.toISOString());
  }
  return out;
}
module.exports={routeCron};
