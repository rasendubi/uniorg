---
"uniorg-parse": patch
---

Fix link type detection in `[[ ]]` links when protocol name occurs in the middle of the URL.

Previously, `[[my-link:https://blah]]` was incorrectly detected as `https` link type. Now it's correctly recognized as `fuzzy` link type.
