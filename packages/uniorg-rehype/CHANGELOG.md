# uniorg-rehype

## 1.3.0

### Minor Changes

- [#117](https://github.com/rasendubi/uniorg/pull/117) [`ebc6ab0`](https://github.com/rasendubi/uniorg/commit/ebc6ab04f1fa9da3a4f9774c6ad2626505166f5f) Thanks [@Eliot00](https://github.com/Eliot00)! - Recognize `.webp` and `.avif` extensions as images.

## 1.2.0

### Minor Changes

- [#109](https://github.com/rasendubi/uniorg/pull/109) [`dbf6452`](https://github.com/rasendubi/uniorg/commit/dbf6452921ad03120bb9df87746aef52ac72b5fb) Thanks [@rasendubi](https://github.com/rasendubi)! - Support `export-snippet` in uniorg, uniorg-parse, uniorg-rehype, and uniorg-stringify.

  `export-snippet` has the following form: `@@backend:value@@`. Example: `@@html:<b>@@some text@@html:</b>`.

  This is a breaking change for uniorg-parse as it may output nodes unknown to downstream users (uniorg-rehype and uniorg-stringify). If you upgrade uniorg-parse, you should also upgrade uniorg-rehype and uniorg-stringify to the corresponding versions.

- [#111](https://github.com/rasendubi/uniorg/pull/111) [`b45baf9`](https://github.com/rasendubi/uniorg/commit/b45baf992db4659e2732e888bd3860b9eff25504) Thanks [@rasendubi](https://github.com/rasendubi)! - Support `line-break` in uniorg, uniorg-parse, uniorg-rehype, and uniorg-stringify.

  This is a breaking change for uniorg-parse as it may output nodes unknown to downstream users (uniorg-rehype and uniorg-stringify). If you upgrade uniorg-parse, you should also upgrade uniorg-rehype and uniorg-stringify to the corresponding versions.

## 1.1.1

### Patch Changes

- [#94](https://github.com/rasendubi/uniorg/pull/94) [`e71a8a8`](https://github.com/rasendubi/uniorg/commit/e71a8a85f4921d53fdf112df17bd37b92af1ed5d) Thanks [@rasendubi](https://github.com/rasendubi)! - Upgrade dependencies.

  Most notably, this upgrades vfile version. This does not change the code and the old code should continue working. But it might break the types so you might need to upgrade vfile version as well (if you're manipulating vfiles directly).

## 1.1.0

### Minor Changes

- [#33](https://github.com/rasendubi/uniorg/pull/33) [`67420e7`](https://github.com/rasendubi/uniorg/commit/67420e7fe05defc99b52aecce75fcc3831d39ff6) Thanks [@rasendubi](https://github.com/rasendubi)! - Support native org-mode citations in uniorg, uniorg-parse, uniorg-rehype, uniorg-stringify.

  This is a breaking change for uniorg-parse as it may output nodes unknown to downstream packages (uniorg-rehype, uniorg-stringify).

  If you upgrade uniorg-parse to >=2, you also need to bump uniorg-rehype to >=1.1 and uniorg-stringify to >=1.1 (if you use these). Upgrading uniorg-rehype and uniorg-stringify does not require bumping uniorg-parse.

  The default rendering of citations in uniorg-rehype is quite primitive and citations are transformed into `cite:` links (to keep some compatibility with org-ref). The handling can be overridden by specifying your own `handlers`.

- [#33](https://github.com/rasendubi/uniorg/pull/33) [`67420e7`](https://github.com/rasendubi/uniorg/commit/67420e7fe05defc99b52aecce75fcc3831d39ff6) Thanks [@rasendubi](https://github.com/rasendubi)! - `OrgToHastOptions` now has `handlers` property. You can override rendering of any org node by passing your own handler.

  For example:

  ```js
  import { h } from 'hastscript';
  const processor = unified()
    .use(uniorgParse)
    .use(uniorg2rehype, {
      handlers: {
        comment: (org) => {
          return h('div.comment', [{ type: 'text', value: org.value }]);
        },
      },
    });
  ```
