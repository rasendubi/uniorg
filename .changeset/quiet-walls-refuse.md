---
'uniorg-parse': patch
---

Fix parsing unicode characters in headline tags. The regex for parsing tags previously used `\w` (word) class, which does not behave correctly with unicode. Update it to use unicode's Letter and Number character properties instead.
