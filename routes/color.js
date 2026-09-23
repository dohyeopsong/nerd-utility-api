// /color — color conversion: hex <-> rgb <-> hsl, named colors, luminance/contrast
const NAMED = { black:'#000000', white:'#ffffff', red:'#ff0000', green:'#008000', blue:'#0000ff', yellow:'#ffff00', cyan:'#00ffff', magenta:'#ff00ff', orange:'#ffa500', purple:'#800080', pink:'#ffc0cb', brown:'#a52a2a', gray:'#808080', grey:'#808080', silver:'#c0c0c0', gold:'#ffd700', navy:'#000080', teal:'#008080', olive:'#808000', lime:'#00ff00', aqua:'#00ffff', fuchsia:'#ff00ff', maroon:'#800000', beige:'#f5f5dc', ivory:'#fffff0', coral:'#ff7f50', salmon:'#fa8072', crimson:'#dc143c', indigo:'#4b0082', violet:'#ee82ee', turquoise:'#40e0d0', khaki:'#f0e68c', lavender:'#e6e6fa', plum:'#dda0dd', tan:'#d2b48c' };
function hex2rgb(h) { h = h.replace('#',''); if (h.length===3) h = h.split('').map(c=>c+c).join(''); return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)]; }
function rgb2hex(r,g,b) { return '#' + [r,g,b].map(x => Math.max(0,Math.min(255,Math.round(x))).toString(16).padStart(2,'0')).join(''); }
function rgb2hsl(r,g,b) { r/=255; g/=255; b/=255; const mx=Math.max(r,g,b), mn=Math.min(r,g,b); let h=0,s=0,l=(mx+mn)/2; const d=mx-mn;
  if (d) { s = l>0.5 ? d/(2-mx-mn) : d/(mx+mn);
    if (mx===r) h=((g-b)/d + (g<b?6:0)); else if (mx===g) h=(b-r)/d+2; else h=(r-g)/d+4; h*=60; }
  return [Math.round(h), Math.round(s*100), Math.round(l*100)]; }
function hsl2rgb(h,s,l) { s/=100; l/=100; const c=(1-Math.abs(2*l-1))*s, x=c*(1-Math.abs((h/60)%2-1)), m=l-c/2;
  let [r,g,b] = h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];
  return [Math.round((r+m)*255), Math.round((g+m)*255), Math.round((b+m)*255)]; }
function routeColor(u, res, json) {
  const p = u.searchParams;
  const hex = p.get('hex'), rgb = p.get('rgb'), hsl = p.get('hsl'), name = p.get('name');
  let r,g,b,src;
  try {
    if (hex || name) {
      let h = hex || NAMED[(name||'').toLowerCase()];
      if (name && !h) return json(res, 404, { error: 'unknown color name', known: Object.keys(NAMED) });
      if (!/^#?[0-9a-f]{3}([0-9a-f]{3})?$/i.test(h)) return json(res, 400, { error: 'invalid hex: use #rgb or #rrggbb' });
      [r,g,b] = hex2rgb(h); src = 'hex:' + rgb2hex(r,g,b);
    } else if (rgb) {
      const m = rgb.split(',').map(Number);
      if (m.length!==3 || m.some(x => isNaN(x)||x<0||x>255)) return json(res, 400, { error: 'invalid rgb: use ?rgb=r,g,b (0-255)' });
      [r,g,b] = m; src = 'rgb';
    } else if (hsl) {
      const m = hsl.split(',').map(Number);
      if (m.length!==3 || m.some(isNaN) || m[1]<0||m[1]>100||m[2]<0||m[2]>100) return json(res, 400, { error: 'invalid hsl: use ?hsl=h,s%,l%' });
      [r,g,b] = hsl2rgb(m[0],m[1],m[2]); src = 'hsl';
    } else return json(res, 200, { usage: '?hex=%23ff8800 or ?rgb=255,136,0 or ?hsl=36,100,50 or ?name=coral' });
    const [h,s,l] = rgb2hsl(r,g,b);
    const lum = (0.2126*r + 0.7152*g + 0.0722*b) / 255;
    const names = Object.entries(NAMED).filter(([,v]) => v === rgb2hex(r,g,b)).map(([k]) => k);
    return json(res, 200, {
      source: src, hex: rgb2hex(r,g,b), rgb: [r,g,b], hsl: [h,s,l],
      luminance: +lum.toFixed(4),
      is_dark: lum < 0.5,
      contrast_with_white: +(1.05/(lum+0.05)).toFixed(2),
      contrast_with_black: +((lum+0.05)/0.05).toFixed(2),
      name: names[0] || null,
    });
  } catch (e) { return json(res, 400, { error: e.message }); }
}
module.exports = { routeColor };
