// Cron parser: /cron?expr=0 9 * * 1-5 — field breakdown, human-readable description, next 3 runs (UTC)
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const DOWS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
function parseField(field,min,max,names){
  // returns array of allowed values or throws
  const map={}; // value -> true
  const nameToVal=n=>{const i=names?names.findIndex(x=>x.toLowerCase().startsWith(n.toLowerCase())):-1;return i>=0?i:null;};
  for(const part of field.split(',')){
    const [range,stepRaw]=part.split('/');
    const step=stepRaw?parseInt(stepRaw,10):1;
    if(!step||step<1)throw new Error('invalid step in "'+field+'"');
    let lo,hi;
    if(range==='*'){lo=min;hi=max;}
    else if(range.includes('-')){
      const [a,b]=range.split('-');
      lo=/^\d+$/.test(a)?parseInt(a,10):nameToVal(a);
      hi=/^\d+$/.test(b)?parseInt(b,10):nameToVal(b);
      if(lo===null||hi===null)throw new Error('invalid name in "'+field+'"');
    }else{
      const v=/^\d+$/.test(range)?parseInt(range,10):nameToVal(range);
      if(v===null)throw new Error('invalid value "'+range+'"');
      lo=v;hi=stepRaw?v:max; // single value with step = start..max
      if(!stepRaw)hi=v;
    }
    if(lo<min||hi>max||lo>hi)throw new Error('value out of range ('+min+'-'+max+') in "'+field+'"');
    for(let v=lo;v<=hi;v+=step)map[v]=true;
  }
  return Object.keys(map).map(Number).sort((a,b)=>a-b);
}
function describeCron(f){
  const [min,h,dom,mon,dow]=f;
  const time=`${String(h[0]).padStart(2,'0')}:${String(min[0]).padStart(2,'0')}`+(h.length>1?` and ${h.length-1} other time${h.length>2?'s':''}`:'');
  let when='every day';
  if(dow.length<7&&dom[0]!==undefined&&dom.length>=28)when='on '+(dow.length===1?DOWS[dow[0]]+'s':dow.map(d=>DOWS[d]).join(', '));
  else if(dow.length===7&&dom.length<28)when='on day'+(dom.length>1?'s':'')+' '+dom.join(', ')+' of '+(mon.length===12?'every month':mon.map(m=>MONTHS[m-1]).join(', '));
  else if(dow.length<7&&dom.length<28)when=`on day ${dom.join(',')} or ${dow.map(d=>DOWS[d]).join(', ')}`;
  return `Runs at ${time} UTC, ${when}`;
}
function nextRuns(f,from,count){
  const [min,h,dom,mon,dow]=f;
  const runs=[];
  let d=new Date(from);d.setSeconds(0,0);d.setMinutes(d.getMinutes()+1);
  while(runs.length<count&&d.getTime()<from+366*86400000){
    if(!mon.includes(d.getUTCMonth()+1)){d.setUTCMonth(d.getUTCMonth()+1,1);d.setUTCHours(0,0,0,0);continue;}
    const domOK=dom.includes(d.getUTCDate());
    const dowOK=dow.includes(d.getUTCDay());
    // standard cron: if both restricted, OR; else the restricted one
    const domRestricted=dom.length<31, dowRestricted=dow.length<7;
    const dayOK=(domRestricted&&dowRestricted)?(domOK||dowOK):(domOK&&dowOK&&dowOK?true:(domRestricted?domOK:dowOK));
    if(!dayOK){d.setUTCDate(d.getUTCDate()+1);d.setUTCHours(0,0,0,0);continue;}
    if(!h.includes(d.getUTCHours())){d.setUTCHours(d.getUTCHours()+1,0,0,0);continue;}
    if(!min.includes(d.getUTCMinutes())){d.setUTCMinutes(d.getUTCMinutes()+1);continue;}
    runs.push(d.toISOString().replace('T',' ').slice(0,16)+' UTC');
    d.setUTCMinutes(d.getUTCMinutes()+1);
  }
  return runs;
}
function routeCron(u,res,json,body){
  try{
    let expr=u.searchParams.get('expr')||u.searchParams.get('cron');
    if(!expr&&body&&typeof body==='object'&&(body.expr||body.cron))expr=body.expr||body.cron;
    if(!expr)return json(res,400,{error:'provide ?expr=<cron expression>'});
    expr=expr.trim().replace(/\s+/g,' ');
    const fields=expr.split(' ');
    if(fields.length<5||fields.length>6)return json(res,400,{error:'cron must have 5 or 6 fields (min hour dom month dow [sec])'});
    const specs=[
      {name:'minute',field:fields[0],min:0,max:59},
      {name:'hour',field:fields[1],min:0,max:23},
      {name:'day-of-month',field:fields[2],min:1,max:31},
      {name:'month',field:fields[3],min:1,max:12,names:MONTHS},
      {name:'day-of-week',field:fields[4],min:0,max:7,names:DOWS},
    ];
    if(fields.length===6)specs.unshift({name:'second',field:fields[0],min:0,max:59});
    const parsed={};
    for(const s of specs){
      let f=s.field;
      if(s.name==='day-of-week'&&f==='7')f='0';
      parsed[s.name]={raw:s.field,values:parseField(f,s.min,s.max,s.names)};
      if(s.name==='day-of-week'&&parsed[s.name].values.includes(7))parsed[s.name].values=[...new Set(parsed[s.name].values.map(v=>v===7?0:v))].sort((a,b)=>a-b);
    }
    const f5=[parsed.minute.values,parsed.hour.values,parsed['day-of-month'].values,parsed.month.values,parsed['day-of-week'].values];
    return json(res,200,{
      expr,
      fields:parsed,
      description:describeCron(f5),
      nextRuns:nextRuns(f5,Date.now(),3),
    });
  }catch(e){return json(res,400,{error:'cron parse failure: '+e.message});}
}
module.exports={routeCron};
