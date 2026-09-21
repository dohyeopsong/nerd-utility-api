// Color converter: hex <-> rgb <-> hsl, luminance, contrast
function hexToRgb(hex) {
  let h = String(hex).trim().replace(/^#/, '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) throw new Error('invalid hex color');
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}
function rgbToHex(r, g, b) {
  const c = v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return '#' + c(r) + c(g) + c(b);
}
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}
function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360; s /= 100; l /= 100;
  if (s === 0) { const v = Math.round(l * 255); return { r: v, g: v, b: v }; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = t => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  return { r: Math.round(f(h + 1/3) * 255), g: Math.round(f(h) * 255), b: Math.round(f(h - 1/3) * 255) };
}
function luminance(r, g, b) {
  const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrast(l1, l2) { const a = Math.max(l1, l2), b = Math.min(l1, l2); return Math.round(((a + 0.05) / (b + 0.05)) * 100) / 100; }
function routeColor(u, res, json) {
  const q = Object.fromEntries(new URL(u, 'http://x').searchParams);
  try {
    let rgb;
    if (q.hex) rgb = hexToRgb(q.hex);
    else if (q.rgb) {
      const m = String(q.rgb).match(/^(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})$/);
      if (!m) return json(res, 400, { error: 'rgb must be "r,g,b" with values 0-255' });
      rgb = { r: +m[1], g: +m[2], b: +m[3] };
      if ([rgb.r, rgb.g, rgb.b].some(v => v > 255)) return json(res, 400, { error: 'rgb values must be 0-255' });
    } else if (q.hsl) {
      const m = String(q.hsl).match(/^(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})$/);
      if (!m) return json(res, 400, { error: 'hsl must be "h,s,l"' });
      rgb = hslToRgb(+m[1], +m[2], +m[3]);
    } else return json(res, 400, { error: 'provide ?hex=, ?rgb=r,g,b, or ?hsl=h,s,l' });
    const { r, g, b } = rgb;
    const hsl = rgbToHsl(r, g, b);
    const lum = luminance(r, g, b);
    const white = contrast(lum, 1), black = contrast(lum, 0);
    return json(res, 200, {
      hex: rgbToHex(r, g, b), rgb: { r, g, b }, hsl,
      luminance: Math.round(lum * 10000) / 10000,
      contrastWithWhite: white, contrastWithBlack: black,
      bestText: white > black ? 'white' : 'black',
      wcagAA: { normalText: Math.max(white, black) >= 4.5, largeText: Math.max(white, black) >= 3 }
    });
  } catch (e) { return json(res, 400, { error: e.message }); }
}
module.exports = { routeColor, hexToRgb, rgbToHsl, hslToRgb, contrast };
