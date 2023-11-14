---
'extract-keywords-example': patch
'uniorg-extract-keywords': patch
'orgast-util-to-string': patch
'orgast-util-visit-ids': patch
'rollup-plugin-orgx': patch
'blog-starter': patch
'uniorg-stringify': patch
'org-braindump': patch
'uniorg-attach': patch
'uniorg-rehype': patch
'uniorg-parse': patch
'uniorg-slug': patch
'astro-org': patch
'example': patch
'uniorg': patch
'@uniorgjs/orgx': patch
---

Upgrade dependencies.

Most notably, this upgrades vfile version. This does not change the code and the old code should continue working. But it might break the types so you might need to upgrade vfile version as well (if you're manipulating vfiles directly).
