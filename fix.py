p = 'server.js'
s = open(p).read()
# Remove fake payment gate: replace 402 block with honest free access
import re
s = re.sub(r"  const paid = req\.headers.*?\n  }\n", "", s, flags=re.S, count=1) if "const paid" in s else s
if "const paid" in s:
    start = s.index("  const paid")
    end = s.index("}", s.index("return res.end", start)) + 2
    s = s[:start] + s[end:]
open(p, 'w').write(s)
print('gate removed' if 'const paid' not in s else 'FAILED')
