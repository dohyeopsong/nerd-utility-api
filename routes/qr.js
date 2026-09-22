// /qr — QR code generator (SVG or text) via qrcode package
const QRCode = require('qrcode');

async function routeQr(u, res, json, body) {
  const q = u.searchParams;
  try {
    const text = q.get('text') || q.get('data') || (body && body.text);
    if (!text) throw new Error('provide ?text=hello');
    const size = Math.min(Math.max(parseInt(q.get('size') || '256', 10), 64), 1024);
    const mode = (q.get('mode') || 'svg').toLowerCase();
    const ec = (q.get('ec') || 'M').toUpperCase();

    if (mode === 'svg') {
      const svg = await QRCode.toString(text, { type: 'svg', errorCorrectionLevel: ec, width: size, margin: 1 });
      res.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400' });
      return res.end(svg);
    }
    if (mode === 'png') {
      const buf = await QRCode.toBuffer(text, { type: 'png', errorCorrectionLevel: ec, width: size, margin: 1 });
      res.writeHead(200, { 'Content-Type': 'image/png', 'Content-Length': buf.length, 'Cache-Control': 'public, max-age=86400' });
      return res.end(buf);
    }
    if (mode === 'text') {
      const txt = await QRCode.toString(text, { type: 'terminal', errorCorrectionLevel: ec });
      return json(res, 200, { text, qr: txt });
    }
    throw new Error('mode must be svg (default), png, or text');
  } catch (e) {
    return json(res, 400, { error: e.message, example: '/qr?text=https://example.com [&mode=svg|png|text] [&size=256] [&ec=L|M|Q|H]' });
  }
}
module.exports = { routeQr };
