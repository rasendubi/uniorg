# ![uniorg](./logo.svg)

[![build](https://github.com/rasendubi/uniorg/workflows/main/badge.svg)](https://github.com/rasendubi/uniorg/actions)
[![codecov](https://codecov.io/gh/rasendubi/uniorg/branch/master/graph/badge.svg?token=dMHp3L9b6D)](https://codecov.io/gh/rasendubi/uniorg)
[![uniorg npm](https://img.shields.io/npm/v/uniorg?label=uniorg)](https://www.npmjs.com/package/uniorg)
[![uniorg-parse npm](https://img.shields.io/npm/v/uniorg-parse?label=uniorg-parse)](https://www.npmjs.com/package/uniorg-parse)
[![uniorg-rehype npm](https://img.shields.io/npm/v/uniorg-rehype?label=uniorg-rehype)](https://www.npmjs.com/package/uniorg-rehype)
[![uniorg-extract-keywords npm](https://img.shields.io/npm/v/uniorg-extract-keywords?label=uniorg-extract-keywords)](https://www.npmjs.com/package/uniorg-extract-keywords)
[![uniorg-slug npm](https://img.shields.io/npm/v/uniorg-slug?label=uniorg-slug)](https://www.npmjs.com/package/uniorg-slug)
[![orgast-util-to-string npm](https://img.shields.io/npm/v/orgast-util-to-string?label=orgast-util-to-string)](https://www.npmjs.com/package/orgast-util-to-string)

**uniorg** is an accurate [Org-mode](https://orgmode.org/) parser compatible with [unified](https://github.com/unifiedjs/unified) ecosystem.

# Why

I want to publish my braindump from org-mode notes. None of the parsers I tried have provided enough precision.

uniorg strives for parsing accuracy rather than speed or ease of writing the parser.

uniorg follows [Org Syntax][org-syntax] and [Org Element API][org-element-api]. It draws heavily from [org-element.el][org-element], which means uniorg sees org files the same way as org-mode does. The code is full of regexes but that's exactly how org-mode parses files.

[org-syntax]: https://orgmode.org/worg/dev/org-syntax.html
[org-element-api]: https://orgmode.org/worg/dev/org-element-api.html
[org-element]: http://git.savannah.gnu.org/cgit/emacs.git/tree/lisp/org/org-element.el

# Demo

- https://braindump.rasen.dev/uniorg — play with how uniorg parses and translates org files.
- [examples/next-blog-starter](./examples/next-blog-starter) — uniorg-powered [Next.js][nextjs] blog example (https://org-blog-starter.vercel.app).
- [examples/org-braindump](./examples/org-braindump) — uniorg-powered [Next.js][nextjs] website tailored to publishing an interlinked collection of notes (https://org-braindump.vercel.app).
- [examples/example](./examples/example) — a simple CLI tool to convert org files to html.

[nextjs]: https://nextjs.org/

# Status

uniorg successfully parses most of the org syntax.
However, there are a couple of places I haven't finished yet:

- [inlinetask](http://git.savannah.gnu.org/cgit/emacs.git/tree/lisp/org/org-inlinetask.el)
- babel-call, inline-babel-call, inline-src-block
- dynamic-block
- target, radio-target
- line-break
- statistics-cookie
- export-snippet
- macro
- switches and parameters in src-block and example-block
- repeater/warning props in timestamp

The rest of the syntax should work fine and exactly the same way as in Emacs (including complex list nesting, links, drawers, clock entries, latex, etc.). If you want to help with items above, grep [parser.ts](./packages/uniorg-parse/src/parser.ts) for `TODO:`.

# Packages

This repository contains the following packages:
- [`uniorg`][uniorg] — Typescript definitions of uniorg syntax tree
- [`uniorg-parse`][uniorg-parse] — Parse org-mode files to uniorg syntax trees
- [`uniorg-rehype`][uniorg-rehype] — Transform uniorg syntax trees to [**rehype**](https://github.com/rehypejs/rehype)
- [`uniorg-extract-keywords`][uniorg-extract-keywords] — Store org-mode keywords to vfile
- [`uniorg-slug`][uniorg-slug] — Add anchors to headings using GitHub's algorithm.
- [`orgast-util-to-string`][orgast-util-to-string] — Utility to get the plain text content of a node

[uniorg]: https://github.com/rasendubi/uniorg/tree/master/packages/uniorg
[uniorg-parse]: https://github.com/rasendubi/uniorg/tree/master/packages/uniorg-parse
[uniorg-rehype]: https://github.com/rasendubi/uniorg/tree/master/packages/uniorg-rehype
[uniorg-extract-keywords]: https://github.com/rasendubi/uniorg/tree/master/packages/uniorg-extract-keywords
[uniorg-slug]: https://github.com/rasendubi/uniorg/tree/master/packages/uniorg-slug
[orgast-util-to-string]: https://github.com/rasendubi/uniorg/tree/master/packages/orgast-util-to-string

# unified

uniorg is compatible with [unified](https://github.com/unifiedjs/unified) ecosystem, so you can take advantage of many existing plugins.

For example, here's how you transform an org-mode to html.

```js
import unified from 'unified';
import parse from 'uniorg-parse';
import uniorg2rehype from 'uniorg-rehype';
import stringify from 'rehype-stringify';

const processor = unified()
  .use(parse)
  .use(uniorg2rehype)
  .use(stringify);

processor
  .process(`* org-mode example\n your text goes here`)
  .then((file) => console.log(file.contents));
```

Plugins for code syntax highlight ([rehype-highlight](https://github.com/rehypejs/rehype-highlight), [@mapbox/rehype-prism](https://github.com/mapbox/rehype-prism)) and latex-formatting ([rehype-katex](https://github.com/remarkjs/remark-math/tree/main/packages/rehype-katex), [rehype-mathjax](https://github.com/remarkjs/remark-math/tree/main/packages/rehype-mathjax)) should work out of the box:

```js
import unified from 'unified';
import parse from 'uniorg-parse';
import uniorg2rehype from 'uniorg-rehype';
import highlight from 'rehype-highlight';
import katex from 'rehype-katex';
import stringify from 'rehype-stringify';

const processor = unified()
  .use(parse)
  .use(uniorg2rehype)
  .use(highlight)
  .use(katex)
  .use(stringify);

processor.process(`* org-mode example
When $a \ne 0$, there are two solutions to \(ax^2 + bx + c = 0\) and they are
$$x = {-b \pm \sqrt{b^2-4ac} \over 2a}.$$

#+begin_src js
console.log('uniorg is cool!');
#+end_src
`).then((file) => console.log(file.contents));
```


# License

[GNU General Public License v3.0 or later](./LICENSE)
