#!/usr/bin/env node
// Generates the MCP server tool list from openapi.json — single source of truth.
// Run after adding endpoints: node mcp-gen/generate.js > npm-package/src/tools.json
const spec = require('../openapi.json');
const tools = [];
for (const [path, methods] of Object.entries(spec.paths || {})) {
  for (const [method, op] of Object.entries(methods)) {
    if (!op || !op.summary) continue;
    const params = (op.parameters || []).map(p => ({
      name: p.name, description: p.description || '', required: !!p.required,
      type: (p.schema && p.schema.type) || 'string'
    }));
    tools.push({
      name: op.operationId || path.replace(/\//g, '_').replace(/^_/, ''),
      description: (op.summary + (op.description ? ' — ' + op.description : '')).slice(0, 500),
      inputSchema: {
        type: 'object',
        properties: Object.fromEntries(params.map(p => [p.name, {type: p.type, description: p.description}])),
        required: params.filter(p => p.required).map(p => p.name)
      },
      _endpoint: { method: method.toUpperCase(), path }
    });
  }
}
console.log(JSON.stringify({generatedAt: new Date().toISOString(), toolCount: tools.length, tools}, null, 2));
