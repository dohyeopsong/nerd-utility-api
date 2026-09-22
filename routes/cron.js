// Cron parser: /cron?expr=30 2 * * * — fields, next runs (UTC), human description
function parseCron(expr){
  const parts=expr.trim().split(/\s+/);
  if(parts.length!==5&&parts.length!==6)return {error:'expected 5 fields (min hour dom mon dow) or 6 (with sec)'};
  const hasSec=parts.length===6;
  const [sec,min,hour,dom,mon,dow]=hasSec?parts:[null,...parts];
  const fieldDesc={sec,min,hour,dom,mon,dow};
  // basic validation
  const validate=(f,lo,hi)=>{
    if(f===null)return true;
    if(f==='*')return true;
    return f.split(',').every(p=>{
      if(/^\*\/\d+$/.test(p)||/^\d+(\/\d+)?$/.test(p))return +p.replace(/\//g,'')<=hi;
      if(/^\d+-\d+$/.test(p)){const[a,b]=p.split('-').map(Number);return a>=lo&&b<=hi&&a<=b;}
      return false;
    });
  };
  const v={sec:[0,59],min:[0,59],hour:[0,23],dom:[1,31],mon:[1,12],dow:[0,7]};
  for(const[k,[lo,hi]]of Object.entries(v)){
    if(!validate(fieldDesc[k],lo,hi))return {error:`invalid ${k} field: ${fieldDesc[k]}`};
  }
  return {ok:true,hasSec,fields:{sec,min,hour,dom,mon,dow}};
}
function describe(expr){
  const r=parseCron(expr);
  if(r.error)return r;
  const f=r.fields;
  const s=[];
  if(f.min==='*'&&f.hour==='*')s.push('every minute');
  else if(f.min.startsWith('*/'))s.push(`every ${f.min.slice(2)} minutes`);
  else if(f.min!=='*')s.push(`at minute ${f.min} past`);
  if(f.hour!=='*'&&f.hour!=='*/1'){
    if(f.hour.startsWith('*/'))s.push(`every ${f.hour.slice(2)} hours`);
    else s.push(`hour ${f.hour}`);
  }
  if(f.dom!=='*')s.push(`on day ${f.dom}`);
  if(f.mon!=='*')s.push(`of month ${f.mon}`);
  if(f.dow!=='*')s.push(`on weekday ${f.dow} (0=Sun)`);
  return s.join(' ')||'every minute';
}
function nextRuns(expr,count){
  const r=parseCron(expr);
  if(r.error)return [];
  const f=r.fields;
  const matches=(val,spec)=>{
    if(spec==='*')return true;
    if(spec.startsWith('*/'))return val%+spec.slice(2)===0;
    return spec.split(',').some(p=>{
      if(p.includes('-')){const[a,b]=p.split('-').map(Number);return val>=a&&val<=b;}
      return +p===val;
    });
  };
  const out=[];let d=new Date();
  d.setUTCSeconds(0,0);d.setUTCMinutes(d.getUTCMinutes()+1);
  for(let i=0;i<count;i++){
    let tries=0;
    while(tries++<5*365*24*60){ // up to ~5 years of minutes
      if(matches(d.getUTCMinutes(),f.min)&&
         matches(d.getUTCHours(),f.hour)&&
         (f.dom==='*'&&f.dow==='*')||(matches(d.getUTCDate(),f.dom)&&matches(d.getUTCDay(),f.dow))||
         (f.dom!=='*'&&f.dow!=='*'&&(matches(d.getUTCDate(),f.dom)||matches(d.getUTCDay(),f.dow)))||
         (f.dom!=='*'&&matches(d.getUTCDate(),f.dom))||
         (f.dow!=='*'&&matches(d.getUTCDay(),f.dow))){
        if(f.mon==='*'||matches(d.getUTCMonth()+1,f.mon)){
          out.push(d.toISOString());
          d.setUTCMinutes(d.getUTCMinutes()+1);
          break;
        }
      }
      d.setUTCMinutes(d.getUTCMinutes()+1);
    }
  }
  return out;
}
function routeCron(u,res,json){
  try{
    const expr=u.searchParams.get('expr')||u.searchParams.get('e');
    if(!expr)return json(res,400,{error:'provide ?expr=<cron expression>'});
    const parsed=parseCron(expr);
    if(parsed.error)return json(res,400,{error:parsed.error});
    return json(res,200,{
      expression:expr,
      ...parsed,
      description:describe(expr),
      nextRuns:nextRuns(expr,3)
    });
  }catch(e){return json(res,500,{error:'cron failure: '+e.message});}
}
module.exports={routeCron};
