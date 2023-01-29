export default {
  testMatch: ['**/src/**/*.spec.ts'],
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]sx?$': 'ts-jest',
  },
  transformIgnorePatterns: [],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  extensionsToTreatAsEsm: ['.ts'],

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
