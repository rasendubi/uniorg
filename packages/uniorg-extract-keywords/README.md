# `uniorg-extract-keywords`

**[uniorg](https://github.com/rasendubi/uniorg)** plugin to extract Org-mode keywords from the document and store them in vfile.data.

## Install

```sh
npm install --save uniorg-extract-keywords
```

## Use

If we have the following `example.org` file:

```org
#+TITLE: Post title
#+AUTHOR: Your Name

other org-mode
```

and

```js
import { unified } from 'unified';
import toVFile from 'to-vfile';
import uniorgParse from 'uniorg-parse';
import { extractKeywords } from 'uniorg-extract-keywords';
import uniorg2rehype from 'uniorg-rehype';
import html from 'rehype-stringify';

unified()
  .use(uniorgParse)
  .use(extractKeywords)
  .use(uniorg2rehype)
  .use(html)
  .process(toVFile.readSync('./example.org'), function (err, file) {
    console.log(file.toString());
    console.log(file.data);
  });
```

will output

```
<p>other org-mode
</p>

{ title: 'Post title', author: 'Your Name' }
```

**Note: you should use to-vfile@6. to-vfile@7 is currently incompatible with unified@9. See [#12](https://github.com/rasendubi/uniorg/issues/12#issuecomment-850945694) for more details.**

## Options

### name

Type: `string?`

Default: `undefined`

Specify a key to store keywords under. For example, `{ name: 'keywords' }` will store all keyword values as `{ data: { keywords: { ... } } }`. By default, all keywords are merged into the `data` object.

Example:

```js
unified()
  .use(uniorgParse)
  .use(extractKeywords, { name: 'keywords' })
  .use(uniorg2rehype)
  .use(html)
  .process('#+TITLE: Example', function (err, file) {
    console.log(file.data);
  });
```

will output

```
{ keywords: { title: 'Example' } }
```

### preserveCase

Type: `boolean`

Default: `false`

Whether to preserve case of the keywords. By default, all keywords are converted to lowercase.

Example:

```js
unified()
  .use(uniorgParse)
  .use(extractKeywords, { preserveCase: true })
  .use(uniorg2rehype)
  .use(html)
  .process('#+TITLE: Example', function (err, file) {
    console.log(file.data);
  });
```

will output

```
{ TITLE: 'Example' }
```

## License

[GNU General Public License v3.0 or later](./LICENSE)
