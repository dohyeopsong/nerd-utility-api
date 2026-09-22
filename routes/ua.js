// UA parser: /ua?ua=<user-agent string> — browser, engine, OS, device type, bot detection (no deps)
function routeUa(u,res,json){
  try{
    const ua=u.searchParams.get('ua')||u.searchParams.get('user_agent')||u.searchParams.get('u');
    if(!ua)return json(res,400,{error:'provide ?ua=<user-agent string>'});
    const r={browser:null,engine:null,os:null,device:'desktop',bot:false,botName:null};
    // Bots (order matters)
    const bots=[[/Googlebot\/?([\d.]*)/,'Googlebot'],[/bingbot/i,'Bingbot'],[/Slurp/i,'Yahoo Slurp'],[/DuckDuckBot/i,'DuckDuckBot'],[/Baiduspider/i,'Baiduspider'],[/YandexBot/i,'YandexBot'],[/Sogou/i,'Sogou'],[/facebookexternalhit/i,'Facebook'],[/Twitterbot/i,'Twitterbot'],[/LinkedInBot/i,'LinkedIn'],[/curl\/?([\d.]*)/,'curl'],[/Wget\/?([\d.]*)/,'Wget'],[/python-requests\/?([\d.]*)/,'python-requests'],[/node-fetch/i,'node-fetch'],[/axios/i,'axios'],[/HeadlessChrome/i,'HeadlessChrome'],[/PhantomJS/i,'PhantomJS'],[/Puppeteer/i,'Puppeteer'],[/Selenium/i,'Selenium'],[/GTmetrix/i,'GTmetrix'],[/bot([^s]|$)/i,'generic bot'],[/spider/i,'spider'],[/crawl/i,'crawler'],[/monitoring|uptime/i,'monitoring']];
    for(const[re,name]of bots)if(re.test(ua)){r.bot=true;r.botName=name;break;}
    // Browsers
    const browsers=[[/Edg(?:e|A|iOS)?\/([\d.]+)/,'Edge'],[/OPR\/([\d.]+)/,'Opera'],[/YaBrowser\/([\d.]+)/,'Yandex'],[/SamsungBrowser\/([\d.]+)/,'Samsung Internet'],[/Firefox\/([\d.]+)/,'Firefox'],[/CriOS\/([\d.]+)/,'Chrome iOS'],[/FxiOS\/([\d.]+)/,'Firefox iOS'],[/Chrome\/([\d.]+)/,'Chrome'],[/Version\/([\d.]+).*Safari/,'Safari'],[/MSIE ([\d.]+)/,'IE'],[/Trident\/.*rv:([\d.]+)/,'IE']];
    for(const[re,name]of browsers){const m=ua.match(re);if(m){r.browser={name,version:m[1]};break;}}
    // Engines
    if(/Gecko\/|rv:/.test(ua)&&!/(like )?Gecko/.test(ua)===false)r.engine=/Gecko\/(\d+)/.test(ua)&&!/AppleWebKit/.test(ua)?'Gecko':r.engine;
    if(/AppleWebKit/.test(ua))r.engine=/Chrome|Edg|OPR/.test(ua)?'Blink':'WebKit';
    else if(/Gecko\//.test(ua)&&!/AppleWebKit/.test(ua))r.engine='Gecko';
    else if(/Trident/.test(ua))r.engine='Trident';
    // OS
    if(/Windows NT ([\d.]+)/.test(ua))r.os={name:'Windows',version:ua.match(/Windows NT ([\d.]+)/)[1]};
    else if(/Mac OS X ([\d_.]+)/.test(ua))r.os={name:'macOS',version:ua.match(/Mac OS X ([\d_.]+)/)[1].replace(/_/g,'.')};
    else if(/Android ([\d.]+)/.test(ua))r.os={name:'Android',version:ua.match(/Android ([\d.]+)/)[1]};
    else if(/(?:iPhone|iPad|iPod).*OS ([\d_]+)/.test(ua))r.os={name:'iOS',version:ua.match(/OS ([\d_]+)/)[1].replace(/_/g,'.')};
    else if(/CrOS/.test(ua))r.os={name:'ChromeOS'};
    else if(/Linux/.test(ua))r.os={name:'Linux'};
    // Device
    if(/iPad|Tablet|Nexus 7|Nexus 10|SM-T/.test(ua))r.device='tablet';
    else if(/Mobi|iPhone|Android.*Mobile/.test(ua))r.device='mobile';
    else if(/TV|SmartTV|AppleTV/.test(ua))r.device='tv';
    return json(res,200,{userAgent:ua,...r});
  }catch(e){return json(res,400,{error:'ua failure: '+e.message});}
}
module.exports={routeUa};
