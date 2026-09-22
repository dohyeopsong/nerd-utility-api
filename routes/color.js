// routes/color.js — color conversion
// GET /color?hex=%23ff8800 | ?rgb=255,136,0 | ?hsl=30,100,50 | ?name=orange
const NAMES = { black:'#000000', white:'#ffffff', red:'#ff0000', green:'#008000', blue:'#0000ff', yellow:'#ffff00', cyan:'#00ffff', magenta:'#ff00ff', orange:'#ffa500', purple:'#800080', pink:'#ffc0cb', gray:'#808080', grey:'#808080', brown:'#a52a2a', navy:'#000080', teal:'#008080' };

function hexToRgb(hex) {
  hex = hex.replace('#', '').trim();
  if (/^[0-9a-f]{3}$/i.test(hex)) hex = [...hex].map(c => c + c).join('');
  if (!/^[0-9a-f]{6}$/i.test(hex)) throw new Error('invalid hex color');
  const n = parseInt(hex, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}
function routeColor(u, res, json) {
  const q = u.searchParams;
  let rgb = null;
  try {
    if (q.get('hex')) rgb = hexToRgb(q.get('hex'));
    else if (q.get('rgb')) { const p = q.get('rgb').split(',').map(Number); if (p.length !== 3 || p.some(isNaN) || p.some(x => x < 0 || x > 255)) throw new Error('invalid rgb'); rgb = { r: p[0], g: p[1], b: p[2] }; }
    else if (q.get('hsl')) { const [h, s, l] = q.get('hsl').split(',').map(Number); if ([h, s, l].some(isNaN)) throw new Error('invalid hsl'); rgb = hslToRgb(h / 360, s / 100, l / 100); }
    else if (q.get('name')) { const hx = NAMES[q.get('name').toLowerCase()]; if (!hx) return json(res, 400, { error: 'unknown name. known: ' + Object.keys(NAMES).join(',') }); rgb = hexToRgb(hx); }
    else return json(res, 400, { error: 'provide hex, rgb, hsl, or name' });
  } catch (e) { return json(res, 400, { error: e.message }); }
  const { r, g, b } = rgb;
  const hsl = rgbToHsl(r, g, b);
  const hex = '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  const lum = +(0.2126 * r + 0.7152 * g + 0.0722 * b).toFixed(1);
  return json(res, 200, {
    hex, rgb: `rgb(${r},${g},${b})`, hsl: `hsl(${hsl.h},${hsl.s}%,${hsl.l}%)`,
    rgbArr: [r, g, b], hslArr: [hsl.h, hsl.s, hsl.l],
    luminance: lum, contrastSafe: lum > 140 ? 'black-text' : 'white-text',
    invert: '#' + [r, g, b].map(x => (255 - x).toString(16).padStart(2, '0')).join('')
  });
}
function hslToRgb(h, s, l) {
  if (s === 0) { const v = Math.round(l * 255); return { r: v, g: v, b: v }; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = t => { if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p; };
  return { r: Math.round(f(h + 1 / 3) * 255), g: Math.round(f(h) * 255), b: Math.round(f(h - 1 / 3) * 255) };
}
module.exports = { routeColor };
