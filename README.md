# uniorg

[Org-mode](https://orgmode.org/) parser compatible with [unified](https://github.com/unifiedjs/unified) ecosystem.

# Why

I want to publish my braindump from org-mode notes. None of the parsers I tried have provided enough precision.


# Demo

You can check the demo at https://braindump.rasen.dev/uniorg (the entire website is built from org-mode pages with uniorg).


# Compatibility

uniorg follows [Org Syntax](https://orgmode.org/worg/dev/org-syntax.html) and [Org Element API](https://orgmode.org/worg/dev/org-element-api.html). It draws heavily from [org-element.el](http://git.savannah.gnu.org/cgit/emacs.git/tree/lisp/org/org-element.el), which means uniorg sees org files the same way org-mode sees it.

There are a couple of places I haven't yet finished:

- subscript, superscripts
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

The rest of the syntax should work fine and exactly same way as in Emacs (including complex list nesting, links, drawers, clock entries, latex, etc.). If you want to help, grep for `TODO:` in <./packages/uniorg-parse/src/parser.ts>.

# unified

uniorg is compatible with [unified](https://github.com/unifiedjs/unified) ecosystem, so you can take advantage of many existing plugins.

For example, here's how you transform an org-mode to html.

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
      .then((file) => console.log(file));

Plugins for code syntax highlight ([rehype-highlight](https://github.com/rehypejs/rehype-highlight), [@mapbox/rehype-prism](https://github.com/mapbox/rehype-prism)) and latex-formatting ([rehype-katex](https://github.com/remarkjs/remark-math/tree/main/packages/rehype-katex), [rehype-mathjax](https://github.com/remarkjs/remark-math/tree/main/packages/rehype-mathjax)) should work out of the box:

```js
import unified from 'unified';
import parse from 'uniorg-parse';
import uniorg2rehype from 'uniorg-rehype';
import highlight from 'rehype-highlight';
import mathjax from 'rehype-mathjax';
import stringify from 'rehype-stringify';

const processor = unified()
  .use(parse)
  .use(uniorg2rehype)
  .use(highlight)
  .use(mathjax)
  .use(stringify);

processor.process(`* org-mode example
When $a \ne 0$, there are two solutions to \(ax^2 + bx + c = 0\) and they are
$$x = {-b \pm \sqrt{b^2-4ac} \over 2a}.$$

#+begin_src js
console.log('uniorg is cool!');
#+end_src
`).then((file) => console.log(file));
```


# License

uniorg is licensed under GPLv3 or later.
