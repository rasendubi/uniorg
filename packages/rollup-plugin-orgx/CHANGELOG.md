# rollup-plugin-orgx

## 2.0.0

### Major Changes

- [#126](https://github.com/rasendubi/uniorg/pull/126) [`7531419`](https://github.com/rasendubi/uniorg/commit/75314196835ee768fc0689cbc6279cf68fedb58b) Thanks [@rasendubi](https://github.com/rasendubi)! - Move uniorg-parse and uniorg-rehype into peer dependencies.

  This is done to give you precise control over your versions of uniorg-parse and uniorg-rehype, so you can account for any quirks or specific needs.

  This shall also allow us to maintain core uniorg packages and integrations independently, so you will be able to use newer integration packages with having to upgrade the parser or vice versa.

  This is a breaking change because you now need to explicitly install uniorg-parse and uniorg-rehype as dependencies in your projects. Previously, these were included as direct dependencies of the packages.

### Patch Changes

- Updated dependencies [[`7531419`](https://github.com/rasendubi/uniorg/commit/75314196835ee768fc0689cbc6279cf68fedb58b)]:
  - @uniorgjs/orgx@2.0.0

## 1.0.4

### Patch Changes

- Updated dependencies []:
  - @uniorgjs/orgx@1.0.8

## 1.0.3

### Patch Changes

- Updated dependencies []:
  - @uniorgjs/orgx@1.0.7

## 1.0.2

### Patch Changes

- Updated dependencies []:
  - @uniorgjs/orgx@1.0.6

## 1.0.1

### Patch Changes

- [#94](https://github.com/rasendubi/uniorg/pull/94) [`e71a8a8`](https://github.com/rasendubi/uniorg/commit/e71a8a85f4921d53fdf112df17bd37b92af1ed5d) Thanks [@rasendubi](https://github.com/rasendubi)! - Upgrade dependencies.

  Most notably, this upgrades vfile version. This does not change the code and the old code should continue working. But it might break the types so you might need to upgrade vfile version as well (if you're manipulating vfiles directly).

- Updated dependencies [[`e71a8a8`](https://github.com/rasendubi/uniorg/commit/e71a8a85f4921d53fdf112df17bd37b92af1ed5d)]:
  - @uniorgjs/orgx@1.0.5
