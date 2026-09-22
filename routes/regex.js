// Regex tester: /regex?pattern=<re>&flags=<f>&text=<s> — match info, groups, exec plan
function safeRe(pattern,flags){
  // limit pattern length to avoid ReDoS-prone huge patterns
  if(pattern.length>2000)throw new Error('pattern too long (max 2000 chars)');
  let re;
  try{re=new RegExp(pattern,flags||'');}
  catch(e){throw new Error('invalid regex: '+e.message);}
  return re;
}
function routeRegex(u,res,json,body){
  try{
    let pattern,flags,text;
    if(body&&body.pattern!==undefined){pattern=body.pattern;flags=body.flags;text=body.text;}
    else{pattern=u.searchParams.get('pattern');flags=u.searchParams.get('flags')||'';text=u.searchParams.get('text')||'';}
    if(pattern===null||pattern===undefined)return json(res,400,{error:'provide ?pattern=<regex>&flags=&text='});
    let re;
    try{re=safeRe(pattern,flags);}catch(e){return json(res,400,{error:e.message});}
    const result={
      pattern,flags,text,isGlobal:re.global,
      valid:true
    };
    if(re.global){
      const matches=[];let m;let guard=0;
      while((m=re.exec(text))!==null&&matches.length<1000&&guard++<10000){
        matches.push({index:m.index,end:m.index+m[0].length,match:m[0],groups:m.slice(1)});
        if(m[0]==='')re.lastIndex++;
      }
      result.matches=matches;
      result.matchCount=matches.length;
    }else{
      const m=re.exec(text);
      if(m){
        result.matched=true;
        result.match={index:m.index,end:m.index+m[0].length,match:m[0],groups:m.slice(1)};
        if(m.groups)result.namedGroups=m.groups;
      }else{result.matched=false;}
    }
    return json(res,200,result);
  }catch(e){return json(res,500,{error:'regex failure: '+e.message});}
}
module.exports={routeRegex,safeRe};
