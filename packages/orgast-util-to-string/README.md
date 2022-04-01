# `orgast-util-to-string`

orgast (uniorg) utility to get the plain text content of a node.

## Install

```sh
npm install orgast-util-to-string
```

## Use

```js
import { unified } from 'unified';
import uniorgParse from 'uniorg-parse';
import { toString } from 'orgast-util-to-string';

const tree = unified()
  .use(uniorgParse)
  .parse('Some /emphasis/, *importance*, and ~code~.');

console.log(toString(tree)); //=> 'Some emphasis, importance, and code.'
```

## API

### `toString(node[, options])`

Get the text content of a node or list of nodes.

The algorithm checks `value` of `node`. If no value is found, the algorithm checks the children of `node` and joins them (without spaces or newlines).

> This is not an org-mode to plain-text library.

## License

[GNU General Public License v3.0 or later](./LICENSE)
