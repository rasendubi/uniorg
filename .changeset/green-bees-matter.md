---
'uniorg-parse': patch
---

Prevent crash when export-block has unexpected parameters.

When export-block was provided unexpected parameters, uniorg has thrown an exception and stopped parsing. org-element fails to parse export-block backend but otherwise continues to parse. We replicate the same behavior in Uniorg now.

Fixes [#83](https://github.com/rasendubi/uniorg/issues/83).
