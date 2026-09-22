// /color — parse any color format, convert to hex/rgb/hsl, plus complementary
function routeColor(u, res, json) {
  const q = u.searchParams;
  const c = (q.get('color') || q.get('c') || '').trim().toLowerCase().replace(/\s+/g, '');
  if (!c) return json(res, 400, { error: 'color required (hex like #ff8800, rgb(255,136,0), or hsl(30,100%,50%))' });
  let r, g, b;
  let source;
  if (/^#?[0-9a-f]{3}$/.test(c)) {
    source = 'hex3'; const h = c.replace('#', '');
    r = parseInt(h[0] + h[0], 16); g = parseInt(h[1] + h[1], 16); b = parseInt(h[2] + h[2], 16);
  } else if (/^#?[0-9a-f]{6}$/.test(c)) {
    source = 'hex6'; const h = c.replace('#', '');
    r = parseInt(h.slice(0, 2), 16); g = parseInt(h.slice(2, 4), 16); b = parseInt(h.slice(4, 6), 16);
  } else {
    const mRgb = c.match(/^rgb\((\d+),(\d+),(\d+)\)$/);
    const mHsl = c.match(/^hsl\((\d+),(\d+)%,(\d+)%\)$/);
    if (mRgb) {
      source = 'rgb';
      r = +mRgb[1]; g = +mRgb[2]; b = +mRgb[3];
    } else if (mHsl) {
      source = 'hsl';
      [r, g, b] = hslToRgb(+mHsl[1], +mHsl[2] / 100, +mHsl[3] / 100);
    } else {
      return json(res, 400, { error: 'unrecognized color format: ' + c });
    }
  }
  if ([r, g, b].some(x => isNaN(x) || x < 0 || x > 255)) return json(res, 400, { error: 'values out of range' });
  const hex = '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  const [h, s, l] = rgbToHsl(r, g, b);
  // luminance (WCAG)
  const lum = (0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b));
  const comp = [255 - r, 255 - g, 255 - b];
  return json(res, 200, {
    input: c, source_format: source,
    hex, rgb: { r, g, b }, rgb_string: `rgb(${r}, ${g}, ${b})`,
    hsl: { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) },
    hsl_string: `hsl(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`,
    complementary: '#' + comp.map(x => x.toString(16).padStart(2, '0')).join(''),
    luminance: +lum.toFixed(4),
    is_dark: lum < 0.5
  });
}
function chan(v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}
function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let rgb;
  if (h < 60) rgb = [c, x, 0]; else if (h < 120) rgb = [x, c, 0];
  else if (h < 180) rgb = [0, c, x]; else if (h < 240) rgb = [0, x, c];
  else if (h < 300) rgb = [x, 0, c]; else rgb = [c, 0, x];
  return rgb.map(v => Math.round((v + m) * 255));
}
module.exports = { routeColor };
