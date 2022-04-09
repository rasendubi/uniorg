# `orgast-util-visit-ids`

orgast (uniorg) utility to visit all nodes with ids.

## Install

```sh
npm install orgast-util-visit-ids
```

## Use

```js
import { unified } from 'unified';
import uniorgParse from 'uniorg-parse';
import { visitIds } from 'orgast-util-visit-ids';

const tree = unified().use(uniorgParse).parse(`
:PROPERTIES:
:ID: id-org-data
:END:

* First headline
:PROPERTIES:
:ID: id-headline
:END:
** Second headline
:PROPERTIES:
:ID: id-headline-2
:END:
`);

visitIds(tree, (id, node) => {
  console.log(id, node.type, node.rawValue);
});
//=> id-org-data org-data undefined
//=> id-headline headline First headline
//=> id-headline-2 headline Second headline
```

## API

### `visitIds(node: OrgData, callback: (id: string, node: OrgData | Headline) => void)`

Call `callback` for every node that has an id assigned.

## License

[GNU General Public License v3.0 or later](./LICENSE)
