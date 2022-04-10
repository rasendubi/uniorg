# `uniorg-slug`

**[uniorg](https://github.com/rasendubi/uniorg)** plugin to add anchors headings using GitHub's algorithm. Similar to [rehype-slug](https://github.com/rehypejs/rehype-slug) but respects org-mode's `CUSTOM_ID` (as `org-html-export`).

## Install

```sh
npm install uniorg-slug
```

## Use

```js
import { unified } from 'unified';
import uniorgParse from 'uniorg-parse';
import { uniorgSlug } from 'uniorg-slug';
import uniorg2rehype from 'uniorg-rehype';
import html from 'rehype-stringify';

const node = unified()
  .use(uniorgParse)
  .use(uniorgSlug)
  .use(uniorg2rehype)
  .use(html)
  .processSync(`
* headline
** nested headline
:PROPERTIES:
:CUSTOM_ID: blah
:END:
** headline
:PROPERTIES:
:ID: my-id
:END:
~id~ property is ignored.
`);

console.log(node.toString());
```

will output:

```
  <h1 id="headline">headline</h1>
  <h2 id="blah">nested headline</h2>
  <h2 id="headline-1">headline</h2>
  <p><code class="inline-code">id</code> property is ignored.</p>
```

## License

[GNU General Public License v3.0 or later](./LICENSE)
