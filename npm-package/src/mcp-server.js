#!/usr/bin/env node
/**
 * Nerd Utility API — MCP server
 * Tools are auto-generated from openapi.json (see mcp-gen/generate.js).
 * Set NERD_API_URL to point at a running instance.
 * Freemium: tools listed in FREE_TOOLS are free; others return 402 with
 * payment instructions (x402 USDC) when the instance enforces pricing.
 */
const http = require('http');
const https = require('https');
const { readFileSync } = require('fs');
const { join, dirname } = require('path');

const API_URL = (process.env.NERD_API_URL || 'http://localhost:8080').replace(/\/$/, '');
const toolsSpec = JSON.parse(readFileSync(join(dirname(__filename), 'tools.json'), 'utf8'));

const FREE_TOOLS = new Set(['health', 'docs', 'stats', 'pricing']);

function apiCall(endpoint, query) {
  const url = new URL(API_URL + endpoint.path);
  for (const [k, v] of Object.entries(query || {})) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  }
  const mod = url.protocol === 'https:' ? https : http;
  return new Promise((resolve) => {
    const req = mod.get(url, { timeout: 15000 }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        try { resolve({ status: res.statusCode, json: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, json: null, text: body }); }
      });
    });
    req.on('error', (e) => resolve({ status: 0, error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, error: 'timeout' }); });
  });
}

const PROTOCOL_VERSION = '2024-11-05';

function handleMessage(msg) {
  const { id, method, params } = msg;
  switch (method) {
    case 'initialize':
      return { jsonrpc: '2.0', id, result: { protocolVersion: PROTOCOL_VERSION, capabilities: { tools: {} }, serverInfo: { name: 'nerd-utility-api', version: '1.1.0' } } };
    case 'notifications/initialized':
      return null; // notification, no response
    case 'tools/list':
      return {
        jsonrpc: '2.0', id,
        result: {
          tools: toolsSpec.tools.map(t => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema
          }))
        }
      };
    case 'tools/call': {
      const name = params.name;
      const args = params.arguments || {};
      const tool = toolsSpec.tools.find(t => t.name === name);
      if (!tool) {
        return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true } };
      }
      return apiCall(tool._endpoint, args).then(r => {
        if (r.status === 402) {
          const pay = r.json && r.json.payment ? `\nPayment (x402 USDC): ${JSON.stringify(r.json.payment)}` : '';
          return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: `402 Payment Required${pay}` }], isError: true } };
        }
        if (r.status === 0) {
          return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: `Error: ${r.error}` }], isError: true } };
        }
        return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(r.json !== null ? r.json : r.text, null, 2) }] } };
      });
    }
    case 'ping':
      return { jsonrpc: '2.0', id, result: {} };
    default:
      return { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } };
  }
}

// stdio JSON-RPC loop
let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (d) => {
  buf += d;
  let idx;
  while ((idx = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, idx).trim();
    buf = buf.slice(idx + 1);
    if (!line) continue;
    let msg;
    try { msg = JSON.parse(line); } catch { continue; }
    const resp = handleMessage(msg);
    if (resp && typeof resp.then === 'function') {
      // tools/call returns a promise (async API call) — write when it settles
      resp.then((r) => { if (r) process.stdout.write(JSON.stringify(r) + '\n'); });
    } else if (resp) {
      process.stdout.write(JSON.stringify(resp) + '\n');
    }
  }
});
process.stdin.on('end', () => process.exit(0));
