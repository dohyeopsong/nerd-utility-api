// Color utilities: /color?hex=%23ff8800 or /color?rgb=255,136,0 or /color?hsl=30,100,50
// Returns conversions both directions + nearest named color + complementary/analogous.
const NAMED = {black:'#000000',white:'#ffffff',red:'#ff0000',lime:'#00ff00',blue:'#0000ff',yellow:'#ffff00',cyan:'#00ffff',magenta:'#ff00ff',silver:'#c0c0c0',gray:'#808080',maroon:'#800000',olive:'#808000',green:'#008000',purple:'#800080',teal:'#008080',navy:'#000080',orange:'#ffa500',pink:'#ffc0cb',brown:'#a52a2a',gold:'#ffd700'};
function hexToRgb(h){h=h.replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');const n=parseInt(h,16);return{r:n>>16&255,g:n>>8&255,b:n&255};}
function rgbToHex(r,g,b){return '#'+[r,g,b].map(x=>Math.round(x).toString(16).padStart(2,'0')).join('');}
function rgbToHsl(r,g,b){r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b);let h,s,l=(max+min)/2;if(max===min){h=s=0;}else{const d=max-min;s=l>0.5?d/(2-max-min):d/(max+min);switch(max){case r:h=(g-b)/d+(g<b?6:0);break;case g:h=(b-r)/d+2;break;default:h=(r-g)/d+4;}h/=6;}return{h:Math.round(h*360),s:Math.round(s*100),l:Math.round(l*100)};}
function hslToRgb(h,s,l){s/=100;l/=100;const c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs(((h/60)%2)-1)),m=l-c/2;let[r,g,b]=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];return{r:Math.round((r+m)*255),g:Math.round((g+m)*255),b:Math.round((b+m)*255)};}
function dist(a,b){const A=hexToRgb(a),B=hexToRgb(b);return Math.sqrt((A.r-B.r)**2+(A.g-B.g)**2+(A.b-B.b)**2);}
function routeColor(u,res,json){
  try{
    const hex=u.searchParams.get('hex'),rgb=u.searchParams.get('rgb'),hsl=u.searchParams.get('hsl');
    let r,g,b;
    if(hex){const m=hex.match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);if(!m)return json(res,400,{error:'hex must be #rgb or #rrggbb'});({r,g,b}=hexToRgb(hex));}
    else if(rgb){const p=rgb.split(',').map(Number);if(p.length!==3||p.some(isNaN)||p.some(x=>x<0||x>255))return json(res,400,{error:'rgb must be r,g,b (0-255 each)'});[r,g,b]=p;}
    else if(hsl){const p=hsl.split(',').map(Number);if(p.length!==3||p.some(isNaN))return json(res,400,{error:'hsl must be h,s,l'});const c=hslToRgb(p[0],p[1],p[2]);({r,g,b}=c);}
    else return json(res,400,{error:'provide ?hex= | ?rgb=r,g,b | ?hsl=h,s,l'});
    const h=rgbToHex(r,g,b),H=rgbToHsl(r,g,b);
    let nearest=null,nd=1e9;for(const[n,v]of Object.entries(NAMED)){const d=dist(h,v);if(d<nd){nd=d;nearest=n;}}
    const comp=rgbToHex(...(x=>[255-x.r,255-x.g,255-x.b])({r,g,b}));
    const analog=[(H.h+30)%360,(H.h+330)%360].map(hh=>{const c=hslToRgb(hh,H.s,H.l);return rgbToHex(c.r,c.g,c.b);});
    return json(res,200,{hex:h,rgb:`${r}, ${g}, ${b}`,rgbArr:[r,g,b],hsl:`hsl(${H.h}, ${H.s}%, ${H.l}%)`,hslObj:H,luminance:Math.round((0.2126*r+0.7152*g+0.0722*b)*100)/100,nearestName:nearest,nameDistance:Math.round(nd*10)/10,complementary:comp,analogous:analog});
  }catch(e){return json(res,500,{error:'color failure: '+e.message});}
}
module.exports={routeColor};
