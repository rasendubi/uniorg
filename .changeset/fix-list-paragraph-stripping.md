---
'uniorg-rehype': major
---

Fix list item paragraph handling to match ox-html's behavior: strip paragraphs from list items when they are the only child or followed by at most one sub-list.

While this is technically a fix to match the expected behavior, it's marked as a major change to highlight that it alters the HTML output. If you depend on the previous HTML structure, you'll need to review and update any CSS or JavaScript that assumes the old output.
