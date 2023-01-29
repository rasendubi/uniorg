# uniorg

## 1.1.0

### Minor Changes

- [#33](https://github.com/rasendubi/uniorg/pull/33) [`67420e7`](https://github.com/rasendubi/uniorg/commit/67420e7fe05defc99b52aecce75fcc3831d39ff6) Thanks [@rasendubi](https://github.com/rasendubi)! - Support native org-mode citations in uniorg, uniorg-parse, uniorg-rehype, uniorg-stringify.

  This is a breaking change for uniorg-parse as it may output nodes unknown to downstream packages (uniorg-rehype, uniorg-stringify).

  If you upgrade uniorg-parse to >=2, you also need to bump uniorg-rehype to >=1.1 and uniorg-stringify to >=1.1 (if you use these). Upgrading uniorg-rehype and uniorg-stringify does not require bumping uniorg-parse.

  The default rendering of citations in uniorg-rehype is quite primitive and citations are transformed into `cite:` links (to keep some compatibility with org-ref). The handling can be overridden by specifying your own `handlers`.
