// /pipeline — chain multiple utility calls in one request
// POST { "steps": [ {"op":"base64","mode":"encode","input":"hi"}, {"op":"hash","algo":"sha256"} ] }
// Each step's output feeds the next step's input. Errors report which step failed.
const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// Minimal local implementations of the most composable ops
const ops = {
  base64: (i, o) => (o.mode === 'decode' ? Buffer.from(String(i), 'base64').toString('utf8') : Buffer.from(String(i)).toString('base64')),
  hash: (i, o) => crypto.createHash(o.algo || 'sha256').update(String(i)).digest('hex'),
  upper: (i) => String(i).toUpperCase(),
  lower: (i) => String(i).toLowerCase(),
  trim: (i) => String(i).trim(),
  json: (i, o) => (o.mode === 'stringify' ? JSON.stringify(typeof i === 'string' ? i : i) : JSON.parse(String(i))),
  url: (i, o) => (o.mode === 'decode' ? decodeURIComponent(String(i)) : encodeURIComponent(String(i))),
  rot13: (i) => String(i).replace(/[a-z]/gi, (c) => String.fromCharCode((c <= 'Z' ? 90 : 122) >= c.charCodeAt(0) + 13 ? c.charCodeAt(0) + 13 : c.charCodeAt(0) - 13)),
};

router.post('/pipeline', (req, res) => {
  const steps = req.body && req.body.steps;
  if (!Array.isArray(steps) || steps.length === 0 || steps.length > 20) {
    return res.status(400).json({ error: 'Provide steps: [{op, input?, options?}], 1-20 steps' });
  }
  let current = req.body.input;
  const trace = [];
  for (let idx = 0; idx < steps.length; idx++) {
    const s = steps[idx];
    if (!s || typeof s.op !== 'string' || !ops[s.op]) {
      return res.status(400).json({ error: `Unknown op "${s && s.op}" at step ${idx}`, available: Object.keys(ops) });
    }
    const input = s.input !== undefined ? s.input : current;
    try {
      current = ops[s.op](input, s.options || {});
      trace.push({ step: idx, op: s.op, ok: true });
    } catch (e) {
      return res.status(422).json({ error: `Step ${idx} (${s.op}) failed: ${e.message}`, trace });
    }
  }
  res.json({ result: current, trace, steps: steps.length });
});

router.get('/pipeline', (req, res) => res.json({
  op: 'pipeline',
  description: 'Chain multiple utility ops in one call. Output of step N is input to step N+1.',
  usage: { method: 'POST', body: { input: 'hello', steps: [{ op: 'upper' }, { op: 'hash', options: { algo: 'sha256' } }] } },
  availableOps: Object.keys(ops),
}));

module.exports = router;
module.exports.router = router;
