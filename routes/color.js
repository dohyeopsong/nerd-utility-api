// Color converter: hex <-> rgb <-> hsl, with luminance/contrast helpers
function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
function hexToRgb(h) {
  let s = h.trim().replace(/^#/, '');
  if (s.length === 3) s = s.split('').map(c => c + c).join('');
  if (s.length === 4) s = s.split('').slice(0,3).map(c => c + c).join(''); // drop alpha
  if (!/^[0-9a-f]{6}$/i.test(s)) return null;
  return { r: parseInt(s.slice(0,2),16), g: parseInt(s.slice(2,4),16), b: parseInt(s.slice(4,6),16) };
}
function rgbToHex(r, g, b) {
  return '#' + [r,g,b].map(x => clamp(Math.round(x),0,255).toString(16).padStart(2,'0')).join('');
}
function rgbToHsl(r, g, b) {
  r/=255; g/=255; b/=255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b), d = max-min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g-b)/d) % 6;
    else if (max === g) h = (b-r)/d + 2;
    else h = (r-g)/d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  const l = (max+min)/2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2*l - 1));
  return { h: Math.round(h), s: Math.round(s*100), l: Math.round(l*100) };
}
function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360; s = clamp(s,0,100)/100; l = clamp(l,0,100)/100;
  const c = (1 - Math.abs(2*l - 1)) * s, x = c * (1 - Math.abs((h/60) % 2 - 1)), m = l - c/2;
  let [r,g,b] = [0,0,0];
  if (h < 60) [r,g,b] = [c,x,0]; else if (h < 120) [r,g,b] = [x,c,0];
  else if (h < 180) [r,g,b] = [0,c,x]; else if (h < 240) [r,g,b] = [0,x,c];
  else if (h < 300) [r,g,b] = [x,0,c]; else [r,g,b] = [c,0,x];
  return { r: Math.round((r+m)*255), g: Math.round((g+m)*255), b: Math.round((b+m)*255) };
}
function relLuminance({r,g,b}) {
  const f = v => { v/=255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4); };
  return 0.2126*f(r) + 0.7152*f(g) + 0.0722*f(b);
}
function routeColor(u, res, json) {
  const hex = u.searchParams.get('hex');
  const rgb = u.searchParams.get('rgb');
  const hsl = u.searchParams.get('hsl');
  const vs = u.searchParams.get('contrast'); // "fg,bg" both hex
  try {
    let c = null;
    if (hex) {
      c = hexToRgb(hex);
      if (!c) return json(res, 400, { error: 'invalid hex (expected #rgb or #rrggbb)' });
    } else if (rgb) {
      const p = rgb.split(',').map(Number);
      if (p.length !== 3 || p.some(isNaN) || p.some(v => v < 0 || v > 255)) return json(res, 400, { error: 'invalid rgb (expected r,g,b 0-255)' });
      c = { r: p[0], g: p[1], b: p[2] };
    } else if (hsl) {
      const p = hsl.split(',').map(Number);
      if (p.length !== 3 || p.some(isNaN) || p[1] < 0 || p[1] > 100 || p[2] < 0 || p[2] > 100) return json(res, 400, { error: 'invalid hsl (expected h,s,l)' });
      c = hslToRgb(p[0], p[1], p[2]);
    } else if (vs) {
      const [f, b] = vs.split(',');
      const fc = hexToRgb(f), bc = hexToRgb(b);
      if (!fc || !bc) return json(res, 400, { error: 'contrast needs two hex colors: ?contrast=fg,bg' });
      const l1 = relLuminance(fc), l2 = relLuminance(bc);
      const ratio = (Math.max(l1,l2) + 0.05) / (Math.min(l1,l2) + 0.05);
      return json(res, 200, { foreground: rgbToHex(fc.r,fc.g,fc.b), background: rgbToHex(bc.r,bc.g,bc.b), contrastRatio: Math.round(ratio*100)/100, wcagAA: ratio >= 4.5, wcagAAA: ratio >= 7, wcagAALarge: ratio >= 3 });
    } else {
      return json(res, 400, { error: 'params: hex | rgb=r,g,b | hsl=h,s,l | contrast=fg,bg' });
    }
    const { r, g, b } = c;
    return json(res, 200, {
      hex: rgbToHex(r, g, b),
      rgb: [r, g, b],
      hsl: rgbToHsl(r, g, b),
      luminance: Math.round(relLuminance(c) * 1000) / 1000,
      isDark: relLuminance(c) < 0.179
    });
  } catch (e) { return json(res, 400, { error: e.message }); }
}
module.exports = { routeColor, hexToRgb, rgbToHex, rgbToHsl, hslToRgb, relLuminance };
