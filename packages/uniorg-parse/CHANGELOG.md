# uniorg-parse

## 3.0.1

### Patch Changes

- [#112](https://github.com/rasendubi/uniorg/pull/112) [`0e1d4b7`](https://github.com/rasendubi/uniorg/commit/0e1d4b7143495fefdbbfc0096a8e8706d5df30de) Thanks [@rasendubi](https://github.com/rasendubi)! - Allow Zero-Width Space as emphasis separator.

## 3.0.0

### Major Changes

- [#109](https://github.com/rasendubi/uniorg/pull/109) [`dbf6452`](https://github.com/rasendubi/uniorg/commit/dbf6452921ad03120bb9df87746aef52ac72b5fb) Thanks [@rasendubi](https://github.com/rasendubi)! - Support `export-snippet` in uniorg, uniorg-parse, uniorg-rehype, and uniorg-stringify.

  `export-snippet` has the following form: `@@backend:value@@`. Example: `@@html:<b>@@some text@@html:</b>`.

  This is a breaking change for uniorg-parse as it may output nodes unknown to downstream users (uniorg-rehype and uniorg-stringify). If you upgrade uniorg-parse, you should also upgrade uniorg-rehype and uniorg-stringify to the corresponding versions.

- [#111](https://github.com/rasendubi/uniorg/pull/111) [`b45baf9`](https://github.com/rasendubi/uniorg/commit/b45baf992db4659e2732e888bd3860b9eff25504) Thanks [@rasendubi](https://github.com/rasendubi)! - Support `line-break` in uniorg, uniorg-parse, uniorg-rehype, and uniorg-stringify.

  This is a breaking change for uniorg-parse as it may output nodes unknown to downstream users (uniorg-rehype and uniorg-stringify). If you upgrade uniorg-parse, you should also upgrade uniorg-rehype and uniorg-stringify to the corresponding versions.

## 2.1.1

### Patch Changes

- [#94](https://github.com/rasendubi/uniorg/pull/94) [`e71a8a8`](https://github.com/rasendubi/uniorg/commit/e71a8a85f4921d53fdf112df17bd37b92af1ed5d) Thanks [@rasendubi](https://github.com/rasendubi)! - Upgrade dependencies.

  Most notably, this upgrades vfile version. This does not change the code and the old code should continue working. But it might break the types so you might need to upgrade vfile version as well (if you're manipulating vfiles directly).

## 2.1.0

### Minor Changes

- [#91](https://github.com/rasendubi/uniorg/pull/91) [`041eb97`](https://github.com/rasendubi/uniorg/commit/041eb9743cbb95bff692eebf821777d2622c09d9) Thanks [@venikx](https://github.com/venikx)! - Add support for switches and parameters in src-blocks.

## 2.0.2

### Patch Changes

- [#84](https://github.com/rasendubi/uniorg/pull/84) [`6c1d090`](https://github.com/rasendubi/uniorg/commit/6c1d0903699f90ebd1dad5102ac9821132e37696) Thanks [@rasendubi](https://github.com/rasendubi)! - Prevent crash when export-block has unexpected parameters.

  When export-block was provided unexpected parameters, uniorg has thrown an exception and stopped parsing. org-element fails to parse export-block backend but otherwise continues to parse. We replicate the same behavior in Uniorg now.

  Fixes [#83](https://github.com/rasendubi/uniorg/issues/83).

## 2.0.1

### Patch Changes

- [#73](https://github.com/rasendubi/uniorg/pull/73) [`67579ad`](https://github.com/rasendubi/uniorg/commit/67579ad2ae4ea5fad46dc4b26c898913921ae064) Thanks [@xandeer](https://github.com/xandeer)! - Fix parsing unicode characters in headline tags. The regex for parsing tags previously used `\w` (word) class, which does not behave correctly with unicode. Update it to use unicode's Letter and Number character properties instead.

## 2.0.0

### Major Changes

- [#33](https://github.com/rasendubi/uniorg/pull/33) [`67420e7`](https://github.com/rasendubi/uniorg/commit/67420e7fe05defc99b52aecce75fcc3831d39ff6) Thanks [@rasendubi](https://github.com/rasendubi)! - Support native org-mode citations in uniorg, uniorg-parse, uniorg-rehype, uniorg-stringify.

  This is a breaking change for uniorg-parse as it may output nodes unknown to downstream packages (uniorg-rehype, uniorg-stringify).

  If you upgrade uniorg-parse to >=2, you also need to bump uniorg-rehype to >=1.1 and uniorg-stringify to >=1.1 (if you use these). Upgrading uniorg-rehype and uniorg-stringify does not require bumping uniorg-parse.

  The default rendering of citations in uniorg-rehype is quite primitive and citations are transformed into `cite:` links (to keep some compatibility with org-ref). The handling can be overridden by specifying your own `handlers`.
