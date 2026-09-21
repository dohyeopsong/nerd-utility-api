import re
p = 'server.js'
s = open(p).read()
if "require('./utils')" not in s:
    s = s.replace("const url = require('url');", "const url = require('url');\nconst utils = require('./utils');")
    s = s.replace("    return json(res, 404, { error: 'unknown endpoint', pricing: '/pricing' });",
"""    for (const [name, fn] of Object.entries(utils)) {
      if (route === '/' + name) return json(res, 200, fn(body, parsed.query));
    }
    return json(res, 404, { error: 'unknown endpoint', pricing: '/pricing' });""")
    open(p, 'w').write(s)
    print('patched')
else:
    print('already patched')
