# `uniorg-stringify`

uniorg plugin to serialize org-mode.

## Install

```sh
npm install uniorg-stringify
```

## Use

```js
import { unified } from 'unified';
import uniorgParse from 'uniorg-parse';
import { uniorgStringify } from 'uniorg-stringify';

const result = unified()
  .use(uniorgParse)
  .use(uniorgStringify)
  .processSync('Some /emphasis/, *importance*, and ~code~.');

console.log(String(result)); //=> Some /emphasis/, *importance*, and ~code~.
```

## API

### `processor().use(uniorgStringify)`

**uniorg** plugin to serialize uniast into string.

### `stringify(uniast)`

Convert uniorg AST into a string.

```js
import { parse } from 'uniorg-parse/lib/parser';
import { stringify } from 'uniorg-stringify/lib/stringify';

stringify(parse(`* headline`));
```

## License

[GNU General Public License v3.0 or later](./LICENSE)
