export default {
  testMatch: ['**/src/**/*.spec.ts'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]sx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  transformIgnorePatterns: [],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  extensionsToTreatAsEsm: ['.ts'],

  // Jest doesn't support prettier-3
  prettierPath: null,
  snapshotFormat: {
    // Jest-29 removed string escaping by default. Enable it back to
    // keep old snapshots compatible.
    escapeString: true,
  },

  collectCoverage: !!process.env.CI,

  // This re-mapping is required because of
  // https://github.com/microsoft/TypeScript/issues/16577.
  //
  // 1. ESM module imports don't try guessing extensions, so .js is required.
  // 2. Typescript is not going to add .js automatically to relative
  //    imports, so we manually specify .js for all imports. However,
  //    typescript properly resolves .js to .ts files, so type
  //    checking works.
  // 3. ts-jest, however, does not resolve .js -> .ts, so the
  //    following remapping is required.
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
