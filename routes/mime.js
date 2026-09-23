// /mime — extension → MIME type lookup (and reverse via ?type=)
const MAP = { html:'text/html', htm:'text/html', css:'text/css', js:'application/javascript', mjs:'application/javascript', json:'application/json', jsonp:'application/javascript', xml:'application/xml', txt:'text/plain', md:'text/markdown', csv:'text/csv', tsv:'text/tab-separated-values', ics:'text/calendar', svg:'image/svg+xml', png:'image/png', jpg:'image/jpeg', jpeg:'image/jpeg', gif:'image/gif', webp:'image/webp', avif:'image/avif', bmp:'image/bmp', ico:'image/x-icon', tiff:'image/tiff', mp3:'audio/mpeg', wav:'audio/wav', ogg:'audio/ogg', m4a:'audio/mp4', flac:'audio/flac', mp4:'video/mp4', webm:'video/webm', mov:'video/quicktime', avi:'video/x-msvideo', mkv:'video/x-matroska', pdf:'application/pdf', zip:'application/zip', gz:'application/gzip', tar:'application/x-tar', '7z':'application/x-7z-compressed', rar:'application/vnd.rar', bz2:'application/x-bzip2', doc:'application/msword', docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xls:'application/vnd.ms-excel', xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ppt:'application/vnd.ms-powerpoint', pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation', odt:'application/vnd.oasis.opendocument.text', ods:'application/vnd.oasis.opendocument.spreadsheet', odp:'application/vnd.oasis.opendocument.presentation', rtf:'application/rtf', woff:'font/woff', woff2:'font/woff2', ttf:'font/ttf', otf:'font/otf', eot:'application/vnd.ms-fontobject', wasm:'application/wasm', mpkg:'application/vnd.apple.installer+xml', dmg:'application/x-apple-diskimage', deb:'application/x-debian-package', rpm:'application/x-rpm', exe:'application/x-msdownload', msi:'application/x-msi', apk:'application/vnd.android.package-archive', jar:'application/java-archive', wasm_:'application/wasm', epub:'application/epub+zip', mobi:'application/x-mobipocket-ebook', yaml:'application/yaml', yml:'application/yaml', toml:'application/toml', ini:'text/plain', conf:'text/plain', env:'text/plain', sh:'text/x-shellscript', py:'text/x-python', rb:'text/x-ruby', php:'application/x-httpd-php', java:'text/x-java-source', c:'text/x-c', cpp:'text/x-c++', h:'text/x-c', go:'text/x-go', rs:'text/rust', ts:'application/typescript', tsx:'application/typescript', jsx:'application/javascript', vue:'text/x-vue', sql:'application/sql', graphql:'application/graphql', pem:'application/x-pem-file', crt:'application/x-x509-ca-cert', key:'application/x-pem-file', p12:'application/x-pkcs12', torrent:'application/x-bittorrent', wasm2:'application/wasm' };
function routeMime(u, res, json) {
  const p = u.searchParams;
  const ext = p.get('ext'), type = p.get('type');
  if (ext) {
    const e = ext.toLowerCase().replace(/^\./, '');
    const m = MAP[e];
    if (m) return json(res, 200, { ext: e, mime: m });
    return json(res, 404, { error: `unknown extension: ${e}`, note: 'try ?type=text/html for reverse lookup' });
  }
  if (type) {
    const t = type.toLowerCase().split(';')[0].trim();
    const exts = Object.entries(MAP).filter(([,v]) => v === t).map(([k]) => k);
    if (exts.length) return json(res, 200, { mime: t, extensions: exts });
    return json(res, 404, { error: `unknown mime type: ${t}` });
  }
  return json(res, 200, { usage: '?ext=png or ?type=image/png (reverse lookup)', known_extensions: Object.keys(MAP).length });
}
module.exports = { routeMime };
