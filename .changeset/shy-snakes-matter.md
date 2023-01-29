---
'uniorg-rehype': minor
---

`OrgToHastOptions` now has `handlers` property. You can override rendering of any org node by passing your own handler.

For example:
```js
import { h } from 'hastscript';
const processor = unified()
  .use(uniorgParse)
  .use(uniorg2rehype, {
    handlers: {
      'comment': (org) => {
        return h('div.comment', [{ type: 'text', value: org.value }]);
      },
    },
  });
```
