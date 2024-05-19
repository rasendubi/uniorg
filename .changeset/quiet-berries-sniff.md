---
'uniorg-parse': major
'uniorg-stringify': minor
'uniorg-rehype': minor
'uniorg': minor
---

Support `line-break` in uniorg, uniorg-parse, uniorg-rehype, and uniorg-stringify.

This is a breaking change for uniorg-parse as it may output nodes unknown to downstream users (uniorg-rehype and uniorg-stringify). If you upgrade uniorg-parse, you should also upgrade uniorg-rehype and uniorg-stringify to the corresponding versions.
