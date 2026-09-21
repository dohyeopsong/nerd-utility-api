// MCP JSON-RPC 2.0 bridge: exposes all tools from mcp-gen/tools.json over HTTP
const fs = require('fs');
const path = require('path');
const http = require('http');
const TOOLS_PATH = path.join(__dirname, 'mcp-gen', 'tools.json');
let _tools = null;
function loadTools() {
  if (_tools) return _tools;
  const d = JSON.parse(fs.readFileSync(TOOLS_PATH, 'utf8'));
  _tools = d.tools || (Array.isArray(d) ? d : []);
  // dedupe by name (alerts appears 3x with different ops)
  const seen = new Map();
  for (const t of _tools) {
    if (!seen.has(t.name)) seen.set(t.name, t);
    else {
      // merge parameter schemas
      const ex = seen.get(t.name);
      for (const p of (t.inputSchema?.properties ? Object.keys(t.inputSchema.properties) : [])) {
        ex.inputSchema = ex.inputSchema || { type: 'object', properties: {} };
        ex.inputSchema.properties[p] = t.inputSchema.properties[p];
      }
      if (t.description && !ex.description.includes(t.description)) ex.description += '; ' + t.description;
    }
  }
  _tools = [...seen.values()];
  return _tools;
}
// execute a tool call by proxying to local HTTP endpoints
function toolToUrl(name, args) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(args || {})) {
    if (v === null || v === undefined) continue;
    q.set(k === 'url' ? 'url' : k, typeof v === 'object' ? JSON.stringify(v) : String(v));
  }
  const map = { 'text-stats': 'text-stats', 'url-encode': 'urlencode' };
  return `/${map[name] || name}${q.toString() ? '?' + q.toString() : ''}`;
}
function callTool(name, args) {
  return new Promise((resolve, reject) => {
    const url = toolToUrl(name, args);
    const req = http.get({ host: '127.0.0.1', port: 8080, path: url, timeout: 15000 }, r => {
      let body = '';
      r.on('data', c => body += c);
      r.on('end', () => {
        try { resolve({ content: [{ type: 'text', text: body }], structuredContent: JSON.parse(body) }); }
        catch { resolve({ content: [{ type: 'text', text: body }] }); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('tool call timeout')); });
  });
}
async function routeMcp(u, res, json, req) {
  if (req.method === 'GET') {
    // discovery: list tools
    const tools = loadTools();
    if (u.pathname === '/mcp/tools' || new URL(u, 'http://x').searchParams.get('list') !== null) {
      return json(res, 200, { protocolVersion: '2024-11-05', capabilities: { tools: {} }, tools: tools.map(t => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })) });
    }
    return json(res, 200, { service: 'nerd-utility-mcp', endpoint: '/mcp', transport: 'http+json-rpc', toolsCount: tools.length, docs: '/mcp?list' });
  }
  // POST: JSON-RPC
  let body = '';
  req.on('data', c => body += c);
  req.on('end', async () => {
    let msg;
    try { msg = JSON.parse(body); } catch { return json(res, 400, { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'parse error' } }); }
    const respond = (result, err) => json(res, err ? 400 : 200, { jsonrpc: '2.0', id: msg.id ?? null, ...(err ? { error: err } : { result }) });
    if (msg.method === 'initialize') return respond({ protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'nerd-utility', version: '1.0.0' } });
    if (msg.method === 'tools/list') return respond({ tools: loadTools().map(t => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })) });
    if (msg.method === 'tools/call') {
      try { return respond(await callTool(msg.params.name, msg.params.arguments)); }
      catch (e) { return respond(null, { code: -32000, message: `tool error: ${e.message}` }); }
    }
    if (msg.method === 'ping') return respond({});
    return respond(null, { code: -32601, message: `method not found: ${msg.method}` });
  });
}
module.exports = { routeMcp, loadTools };
