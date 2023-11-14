# astro-org

## 2.1.0

### Minor Changes

- [#96](https://github.com/rasendubi/uniorg/pull/96) [`2ec17b8`](https://github.com/rasendubi/uniorg/commit/2ec17b87a2b58546307f61110785dac47d7b2b10) Thanks [@rasendubi](https://github.com/rasendubi)! - Support Astro Content Collections.

  astro-org now supports Astro's [Content Collections](https://docs.astro.build/en/guides/content-collections/). You can simply drop org files to `src/collections/*/` directories and it should work.

## 2.0.1

### Patch Changes

- [#94](https://github.com/rasendubi/uniorg/pull/94) [`e71a8a8`](https://github.com/rasendubi/uniorg/commit/e71a8a85f4921d53fdf112df17bd37b92af1ed5d) Thanks [@rasendubi](https://github.com/rasendubi)! - Upgrade dependencies.

  Most notably, this upgrades vfile version. This does not change the code and the old code should continue working. But it might break the types so you might need to upgrade vfile version as well (if you're manipulating vfiles directly).

- Updated dependencies [[`e71a8a8`](https://github.com/rasendubi/uniorg/commit/e71a8a85f4921d53fdf112df17bd37b92af1ed5d)]:
  - uniorg-extract-keywords@1.0.1
  - orgast-util-visit-ids@1.0.1
  - rollup-plugin-orgx@1.0.1
  - uniorg-slug@1.0.1

## 2.0.0

### Major Changes

- [#89](https://github.com/rasendubi/uniorg/pull/89) [`08563bc`](https://github.com/rasendubi/uniorg/commit/08563bc1d6d7e676f0e52519712b602a312acaed) Thanks [@rasendubi](https://github.com/rasendubi)! - Astro v3 support
