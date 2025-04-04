# astro-org

## 4.0.0

### Major Changes

- [#126](https://github.com/rasendubi/uniorg/pull/126) [`7531419`](https://github.com/rasendubi/uniorg/commit/75314196835ee768fc0689cbc6279cf68fedb58b) Thanks [@rasendubi](https://github.com/rasendubi)! - Move uniorg-parse and uniorg-rehype into peer dependencies.

  This is done to give you precise control over your versions of uniorg-parse and uniorg-rehype, so you can account for any quirks or specific needs.

  This shall also allow us to maintain core uniorg packages and integrations independently, so you will be able to use newer integration packages with having to upgrade the parser or vice versa.

  This is a breaking change because you now need to explicitly install uniorg-parse and uniorg-rehype as dependencies in your projects. Previously, these were included as direct dependencies of the packages.

### Patch Changes

- Updated dependencies [[`7531419`](https://github.com/rasendubi/uniorg/commit/75314196835ee768fc0689cbc6279cf68fedb58b)]:
  - rollup-plugin-orgx@2.0.0
  - uniorg-slug@1.0.1

## 3.0.0

### Major Changes

- [#121](https://github.com/rasendubi/uniorg/pull/121) [`12d0768`](https://github.com/rasendubi/uniorg/commit/12d076891ef1d643cd3712e6845e0c45d38c98cb) Thanks [@rasendubi](https://github.com/rasendubi)! - Breaking change: Updated to support Astro 5.x (no longer compatible with Astro 4.x or earlier).

  If you're upgrading, make sure you've upgraded Astro to version 5.x

## 2.1.2

### Patch Changes

- [#114](https://github.com/rasendubi/uniorg/pull/114) [`3af18d6`](https://github.com/rasendubi/uniorg/commit/3af18d630f64f11afda88b93c31f4779473d8e61) Thanks [@rasendubi](https://github.com/rasendubi)! - Bump astro version.

## 2.1.1

### Patch Changes

- Updated dependencies [[`dbf6452`](https://github.com/rasendubi/uniorg/commit/dbf6452921ad03120bb9df87746aef52ac72b5fb), [`b45baf9`](https://github.com/rasendubi/uniorg/commit/b45baf992db4659e2732e888bd3860b9eff25504)]:
  - uniorg-parse@3.0.0
  - rollup-plugin-orgx@1.0.2

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
