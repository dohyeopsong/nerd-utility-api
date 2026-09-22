// Regex tester: /regex?pattern=<re>&text=<sample>&flags=<gi> — matches with groups, capture count, match count
function routeRegex(u,res,json,body){
  try{
    let pattern=u.searchParams.get('pattern')||u.searchParams.get('re');
    let text=u.searchParams.get('text')||u.searchParams.get('test');
    let flags=u.searchParams.get('flags')||'';
    if(!pattern&&body&&typeof body==='object'){pattern=body.pattern;text=text||body.text;flags=flags||body.flags||'';}
    if(pattern===null||pattern===undefined)return json(res,400,{error:'provide ?pattern=<regex>&text=<sample>'});
    if(text===null||text===undefined)text='';
    if(pattern.length>1000)return json(res,413,{error:'pattern too large (1000 chars max)'});
    if(text.length>50000)return json(res,413,{error:'text too large (50KB max)'});
    if(!/^[gimsuy]*$/.test(flags))return json(res,400,{error:'invalid flags (allowed: g i m s u y)'});
    let re;
    try{re=new RegExp(pattern,flags);}catch(e){return json(res,400,{error:'invalid regex: '+e.message});}
    const result={pattern,flags,textLength:text.length,textPreview:text.length>100?text.slice(0,100)+'…':text};
    if(flags.includes('g')){
      const matches=[...text.matchAll(re)];
      result.matchCount=matches.length;
      result.matches=matches.slice(0,100).map((m,i)=>({
        index:m.index,
        match:m[0],
        groups:m.length>1?m.slice(1):undefined,
      }));
      if(matches.length>100)result.truncated=true;
    }else{
      const m=text.match(re);
      if(m){
        result.matched=true;
        result.match=m[0];
        result.index=m.index;
        result.groups=m.length>1?m.slice(1):undefined;
        result.groupCount=m.length-1;
      }else result.matched=false;
    }
    // test if regex is safe/simple: warn on catastrophic backtracking risk
    if(/(\+|\*)\S*(\+|\*)/.test(pattern.replace(/\\./g,''))&&text.length>1000)
      result.warning='nested quantifiers with large text — possible catastrophic backtracking';
    return json(res,200,result);
  }catch(e){return json(res,400,{error:'regex failure: '+e.message});}
}
module.exports={routeRegex};
