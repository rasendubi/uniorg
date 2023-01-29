# `uniorg-rehype`

**[uniorg](https://github.com/rasendubi/uniorg)** plugin to mutate uniorg to **[rehype](https://github.com/rehypejs/rehype)**.

> Note: `uniorg-rehype` doesn't deal with HTML inside the Org (`#+begin_export html`). You'll need [rehype-raw](https://github.com/rehypejs/rehype-raw) if you're planning on doing that.


## Install

```sh
npm install uniorg-rehype
```


## Use

```js
var unified = require('unified')
var createStream = require('unified-stream')
var uniorgParse = require('uniorg-parse')
var uniorg2rehype = require('uniorg-rehype')
var html = require('rehype-stringify')

var processor = unified().use(uniorgParse).use(uniorg2rehype).use(html)

process.stdin.pipe(createStream(processor)).pipe(process.stdout)
```


## API


### `processor().use(uniorg2rehype[, options])`

**uniorg** plugin to mutate to **[rehype](https://github.com/rehypejs/rehype)**.

### `orgToHast(uniorg[, options])`

Convert uniorg AST into hast.

```js
import { parse } from 'uniorg-parse/lib/parser';
import { orgToHast } from 'uniorg-rehype/lib/org-to-hast';

orgToHast(parse(`* headline`));
```

### `options`
#### `imageFilenameExtensions`
Filename extensions that should be considered as images. This is used to decide whether a link should be rendered as an `<a>` or and `<img>`.

#### `useSections`
Whether to wrap all org sections into `<section>`. Defaults to `false`.

#### `footnotesSection`
Renderer function for footnotes. Roughly corresponds to `org-html-footnotes-section`.

#### `handlers`
Allow overriding rendering for any uniorg type. Each handler receives the node of the corresponding type and should return valid hast tree.

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

## License

[GNU General Public License v3.0 or later](./LICENSE)
