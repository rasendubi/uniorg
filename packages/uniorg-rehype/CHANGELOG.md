# uniorg-rehype

## 2.2.0

### Minor Changes

- [#134](https://github.com/rasendubi/uniorg/pull/134) [`392ec12`](https://github.com/rasendubi/uniorg/commit/392ec12e3e2a019d40b2d6efea1456097b25e317) Thanks [@rasendubi](https://github.com/rasendubi)! - Move public-facing type definitions from `devDependencies` to normal `dependencies` to ensure type safety for users without requiring manual installation of types.

  TypeScript will now have more complete type information available, which may surface previously hidden type conflicts but leads to more accurate type checking overall.

- [#134](https://github.com/rasendubi/uniorg/pull/134) [`392ec12`](https://github.com/rasendubi/uniorg/commit/392ec12e3e2a019d40b2d6efea1456097b25e317) Thanks [@rasendubi](https://github.com/rasendubi)! - Refine TypeScript definitions to match `unified`'s `Plugin` interface.

  You shall get better type checking when composing unified pipelines, which may result in detecting new type errors.

### Patch Changes

- Updated dependencies [[`392ec12`](https://github.com/rasendubi/uniorg/commit/392ec12e3e2a019d40b2d6efea1456097b25e317)]:
  - uniorg@1.3.0

## 2.1.0

### Minor Changes

- [#128](https://github.com/rasendubi/uniorg/pull/128) [`40ff5c5`](https://github.com/rasendubi/uniorg/commit/40ff5c5331c47f408484ba84daa2c18d81ba554d) Thanks [@rasendubi](https://github.com/rasendubi)! - Updated verse block handling to match ox-html's behavior by stripping common indentation from all lines.

## 2.0.0

### Major Changes

- [#123](https://github.com/rasendubi/uniorg/pull/123) [`2cb1965`](https://github.com/rasendubi/uniorg/commit/2cb19652d0e527d996693a4aa44f42f5d7df1b24) Thanks [@rasendubi](https://github.com/rasendubi)! - Fix list item paragraph handling to match ox-html's behavior: strip paragraphs from list items when they are the only child or followed by at most one sub-list.

  While this is technically a fix to match the expected behavior, it's marked as a major change to highlight that it alters the HTML output. If you depend on the previous HTML structure, you'll need to review and update any CSS or JavaScript that assumes the old output.

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
