# @uniorgjs/orgx

## 2.0.1

### Patch Changes

- [#136](https://github.com/rasendubi/uniorg/pull/136) [`a31dda4`](https://github.com/rasendubi/uniorg/commit/a31dda4f4c099bcfaf63b0adc05c4e73e1f5e1b2) Thanks [@Sorixelle](https://github.com/Sorixelle)! - Include types in published package

  @uniorgjs/orgx was missing its type declarations when publishing. Include them properly.

## 2.0.0

### Major Changes

- [#126](https://github.com/rasendubi/uniorg/pull/126) [`7531419`](https://github.com/rasendubi/uniorg/commit/75314196835ee768fc0689cbc6279cf68fedb58b) Thanks [@rasendubi](https://github.com/rasendubi)! - Move uniorg-parse and uniorg-rehype into peer dependencies.

  This is done to give you precise control over your versions of uniorg-parse and uniorg-rehype, so you can account for any quirks or specific needs.

  This shall also allow us to maintain core uniorg packages and integrations independently, so you will be able to use newer integration packages with having to upgrade the parser or vice versa.

  This is a breaking change because you now need to explicitly install uniorg-parse and uniorg-rehype as dependencies in your projects. Previously, these were included as direct dependencies of the packages.

## 1.0.8

### Patch Changes

- Updated dependencies [[`ebc6ab0`](https://github.com/rasendubi/uniorg/commit/ebc6ab04f1fa9da3a4f9774c6ad2626505166f5f)]:
  - uniorg-rehype@1.3.0

## 1.0.7

### Patch Changes

- Updated dependencies [[`0e1d4b7`](https://github.com/rasendubi/uniorg/commit/0e1d4b7143495fefdbbfc0096a8e8706d5df30de)]:
  - uniorg-parse@3.0.1

## 1.0.6

### Patch Changes

- Updated dependencies [[`dbf6452`](https://github.com/rasendubi/uniorg/commit/dbf6452921ad03120bb9df87746aef52ac72b5fb), [`b45baf9`](https://github.com/rasendubi/uniorg/commit/b45baf992db4659e2732e888bd3860b9eff25504)]:
  - uniorg-parse@3.0.0
  - uniorg-rehype@1.2.0

## 1.0.5

### Patch Changes

- [#94](https://github.com/rasendubi/uniorg/pull/94) [`e71a8a8`](https://github.com/rasendubi/uniorg/commit/e71a8a85f4921d53fdf112df17bd37b92af1ed5d) Thanks [@rasendubi](https://github.com/rasendubi)! - Upgrade dependencies.

  Most notably, this upgrades vfile version. This does not change the code and the old code should continue working. But it might break the types so you might need to upgrade vfile version as well (if you're manipulating vfiles directly).

- Updated dependencies [[`e71a8a8`](https://github.com/rasendubi/uniorg/commit/e71a8a85f4921d53fdf112df17bd37b92af1ed5d)]:
  - uniorg-rehype@1.1.1
  - uniorg-parse@2.1.1

## 1.0.4

### Patch Changes

- Updated dependencies [[`041eb97`](https://github.com/rasendubi/uniorg/commit/041eb9743cbb95bff692eebf821777d2622c09d9)]:
  - uniorg-parse@2.1.0

## 1.0.3

### Patch Changes

- Updated dependencies [[`6c1d090`](https://github.com/rasendubi/uniorg/commit/6c1d0903699f90ebd1dad5102ac9821132e37696)]:
  - uniorg-parse@2.0.2

## 1.0.2

### Patch Changes

- [#80](https://github.com/rasendubi/uniorg/pull/80) [`7cd7a83`](https://github.com/rasendubi/uniorg/commit/7cd7a832b030934931c376b372d743ba360f5a9e) Thanks [@venikx](https://github.com/venikx)! - Add missing dependencies (`uniorg-parse` and `uniorg-rehype`) to orgx.

## 1.0.1

### Patch Changes

- [#69](https://github.com/rasendubi/uniorg/pull/69) [`0ed9a38`](https://github.com/rasendubi/uniorg/commit/0ed9a3860ea2d23ea2850f6de18b64b7d2dc1c5a) Thanks [@rasendubi](https://github.com/rasendubi)! - Remove accidentally exposed mdExtensions and mdxExtensions options and expose uniorgParseOptions.
