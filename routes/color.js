// /color — color conversion (hex<->rgb<->hsl), luminance, palette generation
function hexToRgb(hex) {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) throw new Error(`invalid hex color: ${hex}`);
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}
function rgbToHex(r, g, b) {
  const c = v => Math.min(255, Math.max(0, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
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
function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let [r, g, b] = [0, 0, 0];
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) };
}
function luminance(r, g, b) {
  const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function routeColor(u, res, json) {
  const q = u.searchParams;
  const hex = q.get('hex');
  const rgb = q.get('rgb');
  const hsl = q.get('hsl');
  const mode = q.get('mode') || 'complementary';

  let base;
  try {
    if (hex) base = hexToRgb(hex);
    else if (rgb) {
      const p = rgb.split(',').map(Number);
      if (p.length !== 3 || p.some(isNaN)) throw new Error('rgb must be r,g,b');
      base = { r: p[0], g: p[1], b: p[2] };
      if ([base.r, base.g, base.b].some(v => v < 0 || v > 255)) throw new Error('rgb values must be 0-255');
    } else if (hsl) {
      const p = hsl.split(',').map(Number);
      if (p.length !== 3 || p.some(isNaN)) throw new Error('hsl must be h,s,l');
      base = hslToRgb(p[0], p[1], p[2]);
    } else {
      return json(res, 400, { error: 'missing color param', example: '/color?hex=%23ff5733 or ?rgb=255,87,51 or ?hsl=10,100,60' });
    }
  } catch (e) { return json(res, 400, { error: e.message }); }

  const h = rgbToHsl(base.r, base.g, base.b);
  const lum = luminance(base.r, base.g, base.b);
  const out = {
    hex: rgbToHex(base.r, base.g, base.b),
    rgb: base,
    hsl: h,
    luminance: +lum.toFixed(4),
    text_color: lum > 0.179 ? '#000000' : '#ffffff',
    wcag_contrast_black: +((lum + 0.05) / 0.05).toFixed(2),
    wcag_contrast_white: +(1.05 / (lum + 0.05)).toFixed(2),
  };

  // palette generation
  const pal = {};
  const toHex = hh => { const c = hslToRgb(hh, h.s, h.l); return rgbToHex(c.r, c.g, c.b); };
  if (mode === 'complementary') {
    pal.complementary = [toHex(h.h), toHex(h.h + 180)];
  } else if (mode === 'analogous') {
    pal.analogous = [toHex(h.h - 30), toHex(h.h), toHex(h.h + 30)];
  } else if (mode === 'triadic') {
    pal.triadic = [toHex(h.h), toHex(h.h + 120), toHex(h.h + 240)];
  } else if (mode === 'shades') {
    pal.shades = [0, 20, 40, 60, 80].map(l => { const c = hslToRgb(h.h, h.s, l); return rgbToHex(c.r, c.g, c.b); });
  } else {
    return json(res, 400, { error: 'mode must be complementary|analogous|triadic|shades' });
  }
  out.palette = pal;
  return json(res, 200, out);
}
module.exports = { routeColor };
