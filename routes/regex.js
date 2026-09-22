// Regex tester: /regex?pattern=^\\d+$&text=12345&flags=gi — match, groups, replace preview
function routeRegex(u,res,json){
  try{
    const pattern=u.searchParams.get('pattern')||u.searchParams.get('p');
    const text=u.searchParams.get('text')||u.searchParams.get('t')||'';
    const flags=u.searchParams.get('flags')||u.searchParams.get('f')||'';
    if(pattern===null||pattern===undefined)return json(res,400,{error:'provide ?pattern=<regex>&text=<string>'});
    if(!/^[gimsuy]*$/.test(flags))return json(res,400,{error:'invalid flags (allowed: g i m s u y)'});
    let re;
    try{re=new RegExp(pattern,flags);}catch(e){return json(res,400,{error:'invalid pattern: '+e.message});}
    const global=re.global;
    const matches=[];
    if(global){
      let m,guard=0;
      while((m=re.exec(text))!==null&&guard++<1000){
        matches.push({index:m.index,match:m[0],groups:m.slice(1)});
        if(m[0]==='')re.lastIndex++;
      }
    }else{
      const m=re.exec(text);
      if(m)matches.push({index:m.index,match:m[0],groups:m.slice(1)});
    }
    const replace=u.searchParams.get('replace');
    let replaced=null;
    if(replace!==null){
      try{replaced=global||flags.includes('g')?text.replace(new RegExp(pattern,flags.includes('g')?flags:flags+'g'),replace):text.replace(re,replace);}catch(e){replaced=null;}
    }
    return json(res,200,{pattern,flags,text,matchCount:matches.length,matches,replaced});
  }catch(e){return json(res,500,{error:'regex failure: '+e.message});}
}
module.exports={routeRegex};
