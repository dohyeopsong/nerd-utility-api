// User-Agent parser: /ua?ua=<string> — browser, engine, os, device, bot flag
const BOTS=/(bot|crawler|spider|slurp|bing|duckduck|yandex|facebookexternalhit|curl|wget|python-requests|node-fetch|axios|go-http|java\/)/i;
function routeUa(u,res,json){
  try{
    const ua=(u.searchParams.get('ua')||'').trim();
    if(!ua)return json(res,400,{error:'provide ?ua=<user-agent string>'});
    const out={ua,bot:BOTS.test(ua)};
    const browser=
      ua.match(/Edg(?:e|A|iOS)?\/([\d.]+)/)?{name:'Edge',version:RegExp.$1}:
      ua.match(/OPR\/([\d.]+)/)?{name:'Opera',version:RegExp.$1}:
      ua.match(/Firefox\/([\d.]+)/)?{name:'Firefox',version:RegExp.$1}:
      ua.match(/Chrome\/([\d.]+)/)?{name:'Chrome',version:RegExp.$1}:
      ua.match(/Version\/([\d.]+).*Safari/)?{name:'Safari',version:RegExp.$1}:
      ua.match(/Safari\/([\d.]+)/)?{name:'Safari (old)',version:RegExp.$1}:
      ua.match(/MSIE ([\d.]+)/)?{name:'IE',version:RegExp.$1}:
      ua.match(/Trident\/.*rv:([\d.]+)/)?{name:'IE',version:RegExp.$1}:null;
    const engine=
      /Gecko\/|Firefox\//.test(ua)?'Gecko':
      /AppleWebKit/.test(ua)?'WebKit':null;
    const os=
      ua.match(/Windows NT ([\d.]+)/)?`Windows NT ${RegExp.$1}`:
      /Mac OS X ([\d_.]+)/.test(ua)?'macOS '+RegExp.$1.replace(/_/g,'.'):
      /Android ([\d.]+)/.test(ua)?`Android ${RegExp.$1}`:
      /iPhone|iPad|iPod/.test(ua)?'iOS':
      /CrOS/.test(ua)?'ChromeOS':
      /Linux/.test(ua)?'Linux':null;
    const device=
      /iPad|Tablet/.test(ua)?'tablet':
      /Mobi|iPhone|Android.*Mobile/.test(ua)?'mobile':'desktop';
    out.browser=browser;out.engine=engine;out.os=os;out.device=device;
    return json(res,200,out);
  }catch(e){return json(res,500,{error:'ua failure: '+e.message});}
}
function setHeaders(){} // legacy compat stub
module.exports={routeUa,setHeaders};
