// User-Agent parser: /ua?ua=<string> — browser, OS, device, bot detection
function parseUA(ua){
  const r={userAgent:ua};
  // Bots
  const botRe=/(bot|crawler|spider|slurp|bingpreview|facebookexternalhit|curl|wget|python-requests|http-client|node-fetch|axios|googlebot|gptbot)/i;
  r.isBot=botRe.test(ua);
  // OS
  if(/Windows NT 10/.test(ua))r.os={name:'Windows',version:'10'};
  else if(/Windows NT ([\d.]+)/.test(ua)){const m=ua.match(/Windows NT ([\d.]+)/);r.os={name:'Windows',version:m[1]};}
  else if(/iPhone; CPU iPhone OS ([\d_]+)/.test(ua)){const m=ua.match(/iPhone; CPU iPhone OS ([\d_]+)/);r.os={name:'iOS',version:m[1].replace(/_/g,'.')};}
  else if(/iPad; CPU OS ([\d_]+)/.test(ua)){const m=ua.match(/iPad; CPU OS ([\d_]+)/);r.os={name:'iPadOS',version:m[1].replace(/_/g,'.')};}
  else if(/Android ([\d.]+)/.test(ua)){const m=ua.match(/Android ([\d.]+)/);r.os={name:'Android',version:m[1]};}
  else if(/Mac OS X ([\d_.]+)/.test(ua)){const m=ua.match(/Mac OS X ([\d_.]+)/);r.os={name:'macOS',version:m[1].replace(/_/g,'.')};}
  else if(/CrOS/.test(ua))r.os={name:'ChromeOS',version:null};
  else if(/Linux/.test(ua))r.os={name:'Linux',version:null};
  else r.os={name:'unknown',version:null};
  // Browser
  if(/Edg\/([\d.]+)/.test(ua)){const m=ua.match(/Edg\/([\d.]+)/);r.browser={name:'Edge',version:m[1]};}
  else if(/OPR\/([\d.]+)/.test(ua)){const m=ua.match(/OPR\/([\d.]+)/);r.browser={name:'Opera',version:m[1]};}
  else if(/Chrome\/([\d.]+)/.test(ua)){const m=ua.match(/Chrome\/([\d.]+)/);r.browser={name:'Chrome',version:m[1]};}
  else if(/Firefox\/([\d.]+)/.test(ua)){const m=ua.match(/Firefox\/([\d.]+)/);r.browser={name:'Firefox',version:m[1]};}
  else if(/Version\/([\d.]+).*Safari/.test(ua)){const m=ua.match(/Version\/([\d.]+)/);r.browser={name:'Safari',version:m[1]};}
  else if(/Safari/.test(ua))r.browser={name:'Safari',version:null};
  else if(/curl\//.test(ua))r.browser={name:'curl',version:null};
  else r.browser={name:'unknown',version:null};
  // Device
  if(/Mobile|Android.*Mobile|iPhone/.test(ua))r.device={type:'mobile'};
  else if(/iPad|Tablet/.test(ua))r.device={type:'tablet'};
  else if(/bot|crawler|spider/i.test(ua))r.device={type:'bot'};
  else r.device={type:'desktop'};
  r.device.isMobile=r.device.type==='mobile'||r.device.type==='tablet';
  return r;
}
function routeUA(u,res,json){
  try{
    const ua=u.searchParams.get('ua');
    if(!ua)return json(res,400,{error:'provide ?ua=<user-agent string>'});
    return json(res,200,parseUA(ua));
  }catch(e){return json(res,500,{error:'ua failure: '+e.message});}
}
module.exports={routeUA,parseUA};
