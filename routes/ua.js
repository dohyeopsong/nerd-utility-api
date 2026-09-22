// User-Agent parser: /ua?ua=<string> or auto-detect from request headers
function parseUA(uaString){
  const ua=uaString||'';
  const r={userAgent:ua};
  // browser
  let m;
  if((m=ua.match(/Edg(?:e|A|iOS)?\/([\d.]+)/))){r.browser='Edge';r.browserVersion=m[1];r.browserEngine='Blink';}
  else if((m=ua.match(/OPR\/([\d.]+)/))){r.browser='Opera';r.browserVersion=m[1];r.browserEngine='Blink';}
  else if((m=ua.match(/Chrome\/([\d.]+)/))){r.browser='Chrome';r.browserVersion=m[1];r.browserEngine='Blink';}
  else if((m=ua.match(/Firefox\/([\d.]+)/))){r.browser='Firefox';r.browserVersion=m[1];r.browserEngine='Gecko';}
  else if((m=ua.match(/Version\/([\d.]+).*Safari/))){r.browser='Safari';r.browserVersion=m[1];r.browserEngine='WebKit';}
  else if((m=ua.match(/Safari\/([\d.]+)/))){r.browser='Safari';r.browserVersion=m[1];r.browserEngine='WebKit';}
  else r.browser=null;
  // os
  if(/Windows NT 10/.test(ua))r.os='Windows 10/11';
  else if(/Windows/.test(ua))r.os='Windows';
  else if(/iPhone|iPad|iPod/.test(ua))r.os='iOS';
  else if(/Mac OS X/.test(ua))r.os='macOS';
  else if(/Android/.test(ua))r.os='Android';
  else if(/Linux/.test(ua))r.os='Linux';
  else r.os=null;
  // device type
  if(/iPad|Tablet/.test(ua))r.deviceType='tablet';
  else if(/Mobi|iPhone|Android.*Mobile/.test(ua))r.deviceType='mobile';
  else if(r.browser)r.deviceType='desktop';
  else r.deviceType='unknown';
  // bot detection
  const botRe=/(bot|crawler|spider|crawling|curl|wget|python-requests|httpclient|axios|node-fetch|PostmanRuntime|libwww|scrapy|googlebot|bingbot|slurp|facebookexternalhit)/i;
  r.isBot=botRe.test(ua);
  if(r.isBot){r.botName=(ua.match(new RegExp(botRe.source,'i'))||[null])[0];}
  return r;
}
function routeUa(u,res,json,body,method){
  try{
    let uaString=null;
    if(method==='POST'&&body&&body.ua)uaString=body.ua;
    else if(body&&body.ua)uaString=body.ua;
    if(!uaString)uaString=u.searchParams.get('ua')||u.searchParams.get('user-agent');
    if(!uaString)return json(res,400,{error:'provide ?ua=<user agent string>'});
    const result=parseUA(uaString);
    return json(res,200,result);
  }catch(e){return json(res,500,{error:'ua failure: '+e.message});}
}
module.exports={routeUa,parseUA};
