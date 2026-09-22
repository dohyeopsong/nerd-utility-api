// User-Agent parser: /ua?ua=<user-agent string>
// Detects browser, version, engine, OS, device type, bot status.
function routeUa(u,res,json,body){
  try{
    const ua=u.searchParams.get('ua')||(body&&body.ua);
    if(!ua)return json(res,400,{error:'provide ?ua=<user-agent string>'});
    const s=String(ua);
    const out={userAgent:s};
    // Browsers (check most specific first)
    const browsers=[
      ['Edg/',{name:'Edge',vendor:'Microsoft'}],
      ['OPR/',{name:'Opera',vendor:'Opera'}],
      ['Opera',{name:'Opera',vendor:'Opera'}],
      ['SamsungBrowser/',{name:'Samsung Internet',vendor:'Samsung'}],
      ['YaBrowser/',{name:'Yandex Browser',vendor:'Yandex'}],
      ['Vivaldi/',{name:'Vivaldi',vendor:'Vivaldi'}],
      ['Brave/',{name:'Brave',vendor:'Brave'}],
      ['Chrome/',{name:'Chrome',vendor:'Google'}],
      ['CriOS/',{name:'Chrome iOS',vendor:'Google'}],
      ['Firefox/',{name:'Firefox',vendor:'Mozilla'}],
      ['FxiOS/',{name:'Firefox iOS',vendor:'Mozilla'}],
      ['Safari/',{name:'Safari',vendor:'Apple'}],
      ['MSIE ',{name:'Internet Explorer',vendor:'Microsoft'}],
      ['Trident/',{name:'Internet Explorer',vendor:'Microsoft'}],
    ];
    for(const [needle,b] of browsers){
      const i=s.indexOf(needle);
      if(i>=0){
        out.browser=b.name;out.browserVendor=b.vendor;
        const vm=s.slice(i+needle.length).match(/^[\d.]+/);
        if(vm)out.browserVersion=vm[0];
        break;
      }
    }
    // Engine
    if(/Gecko\/|rv:/.test(s)&&!/like Gecko/.test(s))out.engine='Gecko';
    if(/AppleWebKit\//.test(s))out.engine=/Chrome|Edg|OPR/.test(s)?'Blink':(/Safari/.test(s)?'WebKit':undefined);
    if(/Trident\//.test(s))out.engine='Trident';
    // OS
    const osMap=[
      [/Windows NT 10\.0/,'Windows 10/11'],[/Windows NT 6\.3/,'Windows 8.1'],[/Windows NT 6\.1/,'Windows 7'],
      [/Windows Phone/,'Windows Phone'],[/Windows/,'Windows'],
      [/iPhone/,'iOS'],[/iPad/,'iPadOS'],[/iPod/,'iOS'],
      [/Android[ /]?([\d.]*)/,'Android'],[/Android/,'Android'],
      [/Mac OS X ([0-9_.]+)/,'macOS'],[/Macintosh/,'macOS'],
      [/CrOS/,'ChromeOS'],[/Ubuntu/,'Ubuntu'],[/Fedora/,'Fedora'],
      [/Linux/,'Linux'],[/FreeBSD/,'FreeBSD'],
    ];
    for(const [re,name] of osMap){
      const m=s.match(re);
      if(m){out.os=name;if(m[1]&&/^[0-9_.]+$/.test(m[1]))out.osVersion=m[1].replace(/_/g,'.');break;}
    }
    // Device
    if(/Mobile|iPhone|iPod/.test(s)&&!/iPad/.test(s))out.device='mobile';
    else if(/iPad|Tablet|Android(?!.*Mobile)/.test(s))out.device='tablet';
    else if(/TV|SmartTV|AppleTV|GoogleTV/.test(s))out.device='tv';
    else if(out.os)out.device='desktop';
    // Bot
    out.bot=/bot|crawl|spider|slurp|curl|wget|python-requests|scrapy|headless|monitor|preview|fetcher|facebookexternalhit|lighthouse/i.test(s);
    return json(res,200,out);
  }catch(e){return json(res,400,{error:'ua failure: '+e.message});}
}
module.exports={routeUa};
