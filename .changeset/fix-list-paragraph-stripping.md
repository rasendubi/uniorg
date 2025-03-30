---
'uniorg-rehype': major
'astro-org': major
---

Fix list item paragraph handling to match ox-html's behavior: strip paragraphs from list items when they are the only child or followed by at most one sub-list.

This is a potentially breaking change for code that depend on the current HTML structure. Any CSS or JavaScript that assumes a consistent structure within list items may need to be updated.
