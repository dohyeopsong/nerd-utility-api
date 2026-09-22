// /color — parse and convert colors: hex <-> rgb <-> hsl, with luminance/contrast helpers
function hexToRgb(h) {
  h = h.replace('#','');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  return { r: parseInt(h.slice(0,2),16), g: parseInt(h.slice(2,4),16), b: parseInt(h.slice(4,6),16) };
}
function rgbToHex(r,g,b) {
  return '#' + [r,g,b].map(v => Math.round(v).toString(16).padStart(2,'0')).join('').toUpperCase();
}
function rgbToHsl(r,g,b) {
  r/=255; g/=255; b/=255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b);
  let h=0, s=0; const l = (max+min)/2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d/(2-max-min) : d/(max+min);
    if (max === r) h = ((g-b)/d + (g < b ? 6 : 0));
    else if (max === g) h = (b-r)/d + 2;
    else h = (r-g)/d + 4;
    h *= 60;
  }
  return { h: Math.round(h), s: Math.round(s*100), l: Math.round(l*100) };
}
function hslToRgb(h,s,l) {
  s/=100; l/=100;
  const c = (1 - Math.abs(2*l - 1)) * s;
  const x = c * (1 - Math.abs((h/60) % 2 - 1));
  const m = l - c/2;
  let [r,g,b] = [0,0,0];
  if (h < 60) [r,g,b] = [c,x,0];
  else if (h < 120) [r,g,b] = [x,c,0];
  else if (h < 180) [r,g,b] = [0,c,x];
  else if (h < 240) [r,g,b] = [0,x,c];
  else if (h < 300) [r,g,b] = [x,0,c];
  else [r,g,b] = [c,0,x];
  return { r: Math.round((r+m)*255), g: Math.round((g+m)*255), b: Math.round((b+m)*255) };
}
function relLuminance(r,g,b) {
  const f = v => { v/=255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); };
  return 0.2126*f(r) + 0.7152*f(g) + 0.0722*f(b);
}
const NAMED = { black:'#000000', white:'#FFFFFF', red:'#FF0000', green:'#008000', blue:'#0000FF', yellow:'#FFFF00', orange:'#FFA500', purple:'#800080', pink:'#FFC0CB', gray:'#808080', cyan:'#00FFFF', magenta:'#FF00FF' };

function routeColor(u, res, json) {
  const q = u.searchParams;
  const c = (q.get('check') || q.get('c') || '').trim();
  if (!c) return json(res, 400, { error: 'provide ?check=FF0000 | #FF0000 | rgb(255,0,0) | red', example: '/color?check=%23FF0000' });

  let rgb = null;
  const s = c.toLowerCase();
  if (NAMED[s]) { rgb = hexToRgb(NAMED[s]); }
  else if (/^#?[0-9a-f]{3}$/.test(s) || /^#?[0-9a-f]{6}$/.test(s)) { rgb = hexToRgb(s); }
  else {
    const m = s.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (m) rgb = { r: +m[1], g: +m[2], b: +m[3] };
  }
  if (!rgb || [rgb.r,rgb.g,rgb.b].some(v => isNaN(v) || v < 0 || v > 255)) {
    return json(res, 200, { input: c, valid: false, reason: 'unrecognized color format' });
  }
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const lum = relLuminance(rgb.r, rgb.g, rgb.b);
  const whiteContrast = (1.05)/(lum+0.05);
  const blackContrast = (lum+0.05)/0.05;
  return json(res, 200, {
    input: c, valid: true,
    hex: rgbToHex(rgb.r,rgb.g,rgb.b),
    rgb: { r: rgb.r, g: rgb.g, b: rgb.b },
    hsl: hsl,
    relative_luminance: Math.round(lum*1000)/1000,
    best_text_color: whiteContrast >= blackContrast ? '#FFFFFF' : '#000000',
    contrast_with_white: Math.round(whiteContrast*100)/100,
    contrast_with_black: Math.round(blackContrast*100)/100,
    is_web_safe: rgb.r % 51 === 0 && rgb.g % 51 === 0 && rgb.b % 51 === 0
  });
}

module.exports = { routeColor };
