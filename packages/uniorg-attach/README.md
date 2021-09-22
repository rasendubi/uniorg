# `uniorg-attach`

**[uniorg](https://github.com/rasendubi/uniorg)** plugin to convert `attachment:` links to `file:` links.

## Install

```sh
npm install --save uniorg-attach
```


## Use

If we have the following `example.org` file:
```org
:PROPERTIES:
:ID:   eae6a180-58d3-44b9-9c95-d8924849d365
:END:

attachment:file.txt
```

and

```js
import unified from 'unified';
import toVFile from 'to-vfile';
import uniorgParse from 'uniorg-parse';
import { uniorgAttach } from 'uniorg-attach';
import uniorg2rehype from 'uniorg-rehype';
import html from 'rehype-stringify';

unified()
  .use(uniorgParse)
  .use(extractKeywords)
  .use(uniorg2rehype)
  .use(html)
  .process(toVFile.readSync('./example.org'), function (err, file) {
    console.log(file.toString());
  })
```

will output

```
<p><a href="file:data/ea/e6a180-58d3-44b9-9c95-d8924849d365/file.txt">file:data/ea/e6a180-58d3-44b9-9c95-d8924849d365/file.txt</a>
</p>
```

## Options

### `idDir`

Type: `string?`

Default: `"data/"`

The directory where attachments are stored. If this is a relative path, it will be interpreted relative to the directory where the Org file lives.

Corresponds to `org-attach-id-dir` in Emacs.

### `useInheritance`

Type: `boolean?`

Default: `false`

> **NOTE:** In Emacs, the default is `'selective` which means that Emacs will look at `org-use-property-inheritance` to check whether `ID` and `DIR` properties are inherited. uniorg-attach does not currently do that. This shouldn’t cause any troubles unless you inherit one property but not the other.

Attachment inheritance for the outline.

Enabling inheritance for implies that attachment links will look through all parent headings until it finds the linked attachment.

Corresponds to `org-attach-use-inheritance` in Emacs.

### `idToPath`

Type: `(id: string) => string`

Default: `idUuidFolderFormat`

A function parsing an ID string into a folder-path.

Similar to `org-attach-id-to-path-function-list` in Emacs, but only allows one function.

This module exports `idUuidFolderFormat` and `idTsFolderFormat` that re-implement two common behaviors for org-attach.

## License

[GNU General Public License v3.0 or later](./LICENSE)
