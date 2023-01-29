---
'uniorg-parse': major
'uniorg-stringify': minor
'uniorg-rehype': minor
'uniorg': minor
---

Support native org-mode citations in uniorg, uniorg-parse, uniorg-rehype, uniorg-stringify.

This is a breaking change for uniorg-parse as it may output nodes unknown to downstream packages (uniorg-rehype, uniorg-stringify).

If you upgrade uniorg-parse to >=2, you also need to bump uniorg-rehype to >=1.1 and uniorg-stringify to >=1.1 (if you use these). Upgrading uniorg-rehype and uniorg-stringify does not require bumping uniorg-parse.

The default rendering of citations in uniorg-rehype is quite primitive and citations are transformed into `cite:` links (to keep some compatibility with org-ref). The handling can be overridden by specifying your own `handlers`.
