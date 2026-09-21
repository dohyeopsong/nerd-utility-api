#!/usr/bin/env node
// MCP server (stdio, JSON-RPC 2.0) exposing the Nerd utility API tools.
// Endpoints are proxied to the local API on :8080 (or PUBLIC_URL if set).
const API = process.env.NERD_API_URL || 'http://localhost:8080';

const TOOLS = [
  { name: 'format', desc: 'Pretty-print / minify JSON text', input: { text: 'string', minify: 'boolean?' }, ep: '/format' },
  { name: 'csv2json', desc: 'Convert CSV text to JSON', input: { csv: 'string' }, ep: '/csv2json' },
  { name: 'json2csv', desc: 'Convert JSON array to CSV', input: { json: 'string' }, ep: '/json2csv' },
  { name: 'base64', desc: 'Base64 encode/decode', input: { text: 'string', decode: 'boolean?' }, ep: '/base64' },
  { name: 'hash', desc: 'Hash text (md5/sha1/sha256/sha512)', input: { text: 'string', algo: 'string?' }, ep: '/hash' },
  { name: 'uuid', desc: 'Generate UUIDs', input: { count: 'number?' }, ep: '/uuid' },
  { name: 'timestamp', desc: 'Current unix time / convert ISO', input: { iso: 'string?' }, ep: '/timestamp' },
  { name: 'text-stats', desc: 'Word/char counts for text', input: { text: 'string' }, ep: '/text-stats' },
  { name: 'qrcode', desc: 'Generate QR code (PNG data URL)', input: { text: 'string', size: 'number?' }, ep: '/qrcode' },
  { name: 'dns', desc: 'DNS lookup for a domain', input: { domain: 'string' }, ep: '/dns' },
  { name: 'headers', desc: 'Fetch HTTP response headers of a URL', input: { url: 'string' }, ep: '/headers' },
  { name: 'price', desc: 'Crypto price lookup (BTC, ETH, ...)', input: { symbol: 'string' }, ep: '/price' },
  { name: 'ipinfo', desc: 'Geolocation info for an IP', input: { ip: 'string' }, ep: '/ipinfo' },
  { name: 'random', desc: 'Random integer between min and max', input: { min: 'number?', max: 'number?' }, ep: '/random' },
  { name: 'password', desc: 'Generate secure random password', input: { length: 'number?' }, ep: '/password' },
  { name: 'lorem', desc: 'Lorem ipsum placeholder text', input: { words: 'number?' }, ep: '/lorem' },
  { name: 'slugify', desc: 'Convert text to URL-safe slug', input: { text: 'string' }, ep: '/slugify' },
  { name: 'case-convert', desc: 'Convert text case (upper/lower/title/camel/snake)', input: { text: 'string', to: 'string?' }, ep: '/case' },
  { name: 'url-encode', desc: 'URL encode/decode text', input: { text: 'string' }, ep: '/url-encode' },
  { name: 'scrape', desc: 'Fetch a URL and extract readable text/links', input: { url: 'string', mode: 'string?' }, ep: '/scrape' },
];

async function callApi(ep, args) {
  const res = await fetch(API + ep, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args || {}),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`API ${res.status}: ${body.slice(0, 300)}`);
  return body;
}

const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin });

function send(obj) { process.stdout.write(JSON.stringify(obj) + '\n'); }

rl.on('line', async (line) => {
  let req;
  try { req = JSON.parse(line); } catch { return send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'parse error' } }); }
  const { id, method, params } = req;
  try {
    if (method && String(method).startsWith('notifications/')) return;

    if (method === 'initialize') {
      return send({ jsonrpc: '2.0', id, result: { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'nerd-utility-api', version: '1.0.0' } } });
    }
    if (method === 'tools/list') {
      return send({ jsonrpc: '2.0', id, result: { tools: TOOLS.map(t => ({
        name: t.name, description: t.desc,
        inputSchema: { type: 'object', properties: t.input },
      })) } });
    }
    if (method === 'tools/call') {
      const tool = TOOLS.find(t => t.name === params.name);
      if (!tool) throw new Error(`unknown tool: ${params.name}`);
      const out = await callApi(tool.ep, params.arguments || {});
      return send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: out }] } });
    }
    if (method === 'ping') return send({ jsonrpc: '2.0', id, result: {} });
    return send({ jsonrpc: '2.0', id, error: { code: -32601, message: `method not found: ${method}` } });
  } catch (e) {
    send({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: 'ERROR: ' + e.message }], isError: true } });
  }
});
console.error('nerd-utility-api MCP server (stdio) ready');
