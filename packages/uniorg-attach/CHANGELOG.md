# uniorg-attach

## 1.1.0

### Minor Changes

- [#134](https://github.com/rasendubi/uniorg/pull/134) [`392ec12`](https://github.com/rasendubi/uniorg/commit/392ec12e3e2a019d40b2d6efea1456097b25e317) Thanks [@rasendubi](https://github.com/rasendubi)! - Move public-facing type definitions from `devDependencies` to normal `dependencies` to ensure type safety for users without requiring manual installation of types.

  TypeScript will now have more complete type information available, which may surface previously hidden type conflicts but leads to more accurate type checking overall.

### Patch Changes

- Updated dependencies [[`392ec12`](https://github.com/rasendubi/uniorg/commit/392ec12e3e2a019d40b2d6efea1456097b25e317)]:
  - uniorg@1.3.0

## 1.0.1

### Patch Changes

- [#94](https://github.com/rasendubi/uniorg/pull/94) [`e71a8a8`](https://github.com/rasendubi/uniorg/commit/e71a8a85f4921d53fdf112df17bd37b92af1ed5d) Thanks [@rasendubi](https://github.com/rasendubi)! - Upgrade dependencies.

  Most notably, this upgrades vfile version. This does not change the code and the old code should continue working. But it might break the types so you might need to upgrade vfile version as well (if you're manipulating vfiles directly).
