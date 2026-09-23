// /pipeline — chain multiple utility ops in one request (matches app.js raw-http route pattern)
const crypto = require('crypto');

const ops = {
  base64: (i, o) => (o.mode === 'decode' ? Buffer.from(String(i), 'base64').toString('utf8') : Buffer.from(String(i)).toString('base64')),
  hash: (i, o) => crypto.createHash(o.algo || 'sha256').update(String(i)).digest('hex'),
  upper: (i) => String(i).toUpperCase(),
  lower: (i) => String(i).toLowerCase(),
  trim: (i) => String(i).trim(),
  json_parse: (i) => JSON.parse(String(i)),
  url: (i, o) => (o.mode === 'decode' ? decodeURIComponent(String(i)) : encodeURIComponent(String(i))),
  hex: (i, o) => (o.mode === 'decode' ? Buffer.from(String(i), 'hex').toString('utf8') : Buffer.from(String(i)).toString('hex')),
};

async function routePipeline(u, res, json, body, method) {
  const q = u.searchParams;
  if (method === 'GET') {
    return json(res, 200, {
      op: 'pipeline',
      description: 'Chain utility ops in one call. Output of step N is input to step N+1.',
      usage: 'POST {"input":"hello","steps":[{"op":"upper"},{"op":"hash","options":{"algo":"md5"}}]}',
      availableOps: Object.keys(ops),
    });
  }
  const steps = body && body.steps;
  if (!Array.isArray(steps) || steps.length === 0 || steps.length > 20) {
    return json(res, 400, { error: 'Provide steps: [{op, input?, options?}], 1-20 steps', available: Object.keys(ops) });
  }
  let current = body.input;
  const trace = [];
  for (let idx = 0; idx < steps.length; idx++) {
    const s = steps[idx];
    if (!s || typeof s.op !== 'string' || !ops[s.op]) {
      return json(res, 400, { error: `Unknown op "${s && s.op}" at step ${idx}`, available: Object.keys(ops) });
    }
    const input = s.input !== undefined ? s.input : current;
    try {
      current = ops[s.op](input, s.options || {});
      trace.push({ step: idx, op: s.op, ok: true });
    } catch (e) {
      return json(res, 422, { error: `Step ${idx} (${s.op}) failed: ${e.message}`, trace });
    }
  }
  return json(res, 200, { result: current, trace, steps: steps.length });
}

module.exports = { routePipeline };
