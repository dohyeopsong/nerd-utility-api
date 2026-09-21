// /color?hex=FF8800 or ?r=255&g=136&b=0 or ?hsl=30,100,50
// Returns hex, rgb, hsl, css strings, luminance, and WCAG contrast vs white/black.
function parseHex(s) {
  s = s.replace(/^#/, '').trim();
  if (/^[0-9a-f]{3}$/i.test(s)) s = s.split('').map(c => c + c).join('');
  if (!/^[0-9a-f]{6}$/i.test(s)) return null;
  return { r: parseInt(s.slice(0, 2), 16), g: parseInt(s.slice(2, 4), 16), b: parseInt(s.slice(4, 6), 16) };
}
function toHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
    else if (max === g) h = ((b - r) / d + 2);
    else h = ((r - g) / d + 4);
    h *= 60;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}
function luminance({ r, g, b }) {
  const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrast(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return Math.round(((l1 + 0.05) / (l2 + 0.05)) * 100) / 100;
}
function routeColor(u, res, json) {
  const hexParam = u.searchParams.get('hex');
  const hslParam = u.searchParams.get('hsl');
  let rgb = null;
  if (hexParam) {
    rgb = parseHex(hexParam);
    if (!rgb) return json(res, 400, { error: 'invalid hex (use 3 or 6 digits)', example: '/color?hex=FF8800' });
  } else if (hslParam) {
    const m = hslParam.split(',').map(Number);
    if (m.length !== 3 || m.some(isNaN)) return json(res, 400, { error: 'invalid hsl (use h,s,l e.g. 30,100,50)' });
    let [h, s, l] = m; s /= 100; l /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m2 = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60) [r, g, b] = [c, x, 0]; else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x]; else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c]; else [r, g, b] = [c, 0, x];
    rgb = { r: Math.round((r + m2) * 255), g: Math.round((g + m2) * 255), b: Math.round((b + m2) * 255) };
  } else {
    const r = parseInt(u.searchParams.get('r')), g = parseInt(u.searchParams.get('g')), b = parseInt(u.searchParams.get('b'));
    if ([r, g, b].some(v => isNaN(v) || v < 0 || v > 255)) return json(res, 400, { error: 'pass hex=, hsl=h,s,l, or r=&g=&b= (0-255)' });
    rgb = { r, g, b };
  }
  const hex = '#' + [rgb.r, rgb.g, rgb.b].map(c => c.toString(16).padStart(2, '0')).join('').toUpperCase();
  const hsl = toHsl(rgb);
  const lum = Math.round(luminance(rgb) * 1000) / 1000;
  const cW = contrast(rgb, { r: 255, g: 255, b: 255 });
  const cB = contrast(rgb, { r: 0, g: 0, b: 0 });
  const wcag = c => c >= 7 ? 'AAA' : c >= 4.5 ? 'AA' : c >= 3 ? 'AA (large text only)' : 'FAIL';
  return json(res, 200, {
    hex, rgb: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`, rgbObj: rgb, hsl: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`, hslObj: hsl,
    luminance: lum,
    contrastVsWhite: cW, wcagWhite: wcag(cW),
    contrastVsBlack: cB, wcagBlack: wcag(cB),
    bestTextColor: cW >= cB ? '#FFFFFF' : '#000000'
  });
}
module.exports = { routeColor };
