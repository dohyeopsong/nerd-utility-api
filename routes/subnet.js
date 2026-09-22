// Subnet calculator: /subnet?cidr=192.168.1.10/24 — network, broadcast, mask, usable hosts
function ip2int(ip){
  const p=ip.split('.').map(Number);
  if(p.length!==4||p.some(o=>isNaN(o)||o<0||o>255))throw new Error(`invalid IPv4 "${ip}"`);
  return ((p[0]<<24)|(p[1]<<16)|(p[2]<<8)|p[3])>>>0;
}
function int2ip(n){return [(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255].join('.');}
function routeSubnet(u,res,json,body){
  try{
    let cidr=u.searchParams.get('cidr')||u.searchParams.get('c')||u.searchParams.get('subnet');
    if(!cidr&&body&&typeof body==='object'&&(body.cidr||body.subnet))cidr=body.cidr||body.subnet;
    if(!cidr)return json(res,400,{error:'provide ?cidr=<ip>/<prefix> e.g. 192.168.1.10/24'});
    if(!cidr.includes('/'))cidr+='/32';
    const[ipStr,preStr]=cidr.split('/');
    const prefix=+preStr;
    if(isNaN(prefix)||prefix<0||prefix>32)throw new Error(`invalid prefix /${preStr} (must be 0-32)`);
    const ip=ip2int(ipStr);
    const mask=prefix===0?0:(0xFFFFFFFF<<(32-prefix))>>>0;
    const network=(ip&mask)>>>0;
    const broadcast=(network|(prefix===0?0xFFFFFFFF>>>0:~mask))>>>0;
    const total=2**(32-prefix);
    const usable=prefix>=31?total:(total-2);
    const first=prefix>=31?network:network+1;
    const last=prefix>=31?broadcast:broadcast-1;
    const ranges=[['0.0.0.0/8','private'],['10.0.0.0/8','private'],['100.64.0.0/10','CGNAT'],['127.0.0.0/8','loopback'],['169.254.0.0/16','link-local'],['172.16.0.0/12','private'],['192.0.0.0/24','IETF'],['192.0.2.0/24','TEST-NET-1'],['192.88.99.0/24','6to4 relay'],['192.168.0.0/16','private'],['198.18.0.0/15','benchmark'],['198.51.100.0/24','TEST-NET-2'],['203.0.113.0/24','TEST-NET-3'],['224.0.0.0/4','multicast'],['240.0.0.0/4','reserved']];
    let scope='public';
    for(const[r,tag]of ranges){
      const[rip,rpre]=r.split('/');
      const rm=(0xFFFFFFFF<<(32-+rpre))>>>0;
      if((ip&rm)>>>0===ip2int(rip)){scope=tag;break;}
    }
    return json(res,200,{cidr:ipStr+'/'+prefix,network:int2ip(network),netmask:int2ip(mask),wildcard:int2ip(~mask>>>0),broadcast:int2ip(broadcast),firstHost:int2ip(first),lastHost:int2ip(last),totalAddresses:total,usableHosts:usable,ipClass:ipStr.startsWith('1')&&+ipStr.split('.')[0]<=126?'A':(ipStr.startsWith('128')||+ipStr.split('.')[0]<=191?'B':(+ipStr.split('.')[0]<=223?'C':'D/E')),scope});
  }catch(e){return json(res,400,{error:'subnet failure: '+e.message});}
}
module.exports={routeSubnet};
