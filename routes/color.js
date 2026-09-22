// /color — parse and convert colors between hex, rgb, hsl
function parseHex(s) {
  s = s.replace('#', '');
  if (s.length === 3 || s.length === 4) s = s.split('').map(c => c + c).join('');
  if (![6, 8].includes(s.length) || /[^0-9a-fA-F]/.test(s)) throw new Error('invalid hex color');
  const r = parseInt(s.slice(0, 2), 16), g = parseInt(s.slice(2, 4), 16), b = parseInt(s.slice(4, 6), 16);
  const a = s.length === 8 ? parseInt(s.slice(6, 8), 16) / 255 : 1;
  return { r, g, b, a };
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
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

function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
    else if (max === g) h = ((b - r) / d + 2);
    else h = ((r - g) / d + 4);
    h *= 60;
  }
  return { h: Math.round(h), s: Math.round((max ? d / max : 0) * 100), v: Math.round(max * 100) };
}

function luminance(r, g, b) {
  const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function routeColor(u, res, json) {
  const q = Object.fromEntries(u.searchParams.entries());
  const input = (q.color || q.hex || '').trim();
  if (!input) throw new Error('provide ?color=<hex|rgb(...) or r,g,b>');

  let r, g, b, a = 1;
  const rgbM = input.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/i);
  if (input.startsWith('#')) ({ r, g, b, a } = parseHex(input));
  else if (rgbM) { r = +rgbM[1]; g = +rgbM[2]; b = +rgbM[3]; a = rgbM[4] !== undefined ? +rgbM[4] : 1; }
  else if (/^\d+\s*,\s*\d+\s*,\s*\d+$/.test(input)) { [r, g, b] = input.split(',').map(Number); }
  else throw new Error('unrecognized color format');

  if ([r, g, b].some(v => v < 0 || v > 255 || !Number.isInteger(v))) throw new Error('rgb values must be 0-255');

  const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  const lum = luminance(r, g, b);
  const hsv = rgbToHsv(r, g, b);
  const hsl = rgbToHsl(r, g, b);

  return json(res, 200, {
    input, valid: true,
    hex, hexWithAlpha: a !== 1 ? hex + Math.round(a * 255).toString(16).padStart(2, '0') : undefined,
    rgb: { r, g, b }, rgba: `rgba(${r}, ${g}, ${b}, ${a})`,
    hsl: `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`, hsv: `hsv(${hsv.h}, ${hsv.s}%, ${hsv.v}%)`,
    luminance: +lum.toFixed(4),
    brightness: lum > 0.5 ? 'light' : 'dark',
    wcagContrastWhite: +((1.05) / (lum + 0.05)).toFixed(2),
    wcagContrastBlack: +((lum + 0.05) / 0.05).toFixed(2),
    recommendedText: lum > 0.179 ? '#000000' : '#ffffff'
  });
}

module.exports = { routeColor };
