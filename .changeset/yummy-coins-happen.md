---
'uniorg-parse': minor
---

Add support for passing parser options to the unified plugin.

Previously, you couldn't configure the parser through the unified plugin API. Now you can pass options when using the plugin: `unified().use(uniorgParse, { todoKeywords: ['TODO', 'DONE', 'WAITING'] })` and these options will be passed to the parser.
