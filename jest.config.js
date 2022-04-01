module.exports = {
  projects: ['<rootDir>/packages/*'],
  // do not search for tests starting from the root directory
  testMatch: ['!**'],
  // globals: {
  //   'ts-jest': {
  //     useESM: true,
  //   },
  // },
  // testEnvironment: 'node',
  // transform: {
  //   '^.+\\.[tj]sx?$': 'ts-jest',
  // },
  // transformIgnorePatterns: ['*.config.js'],
  // moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  // extensionsToTreatAsEsm: ['.ts'],
  // moduleNameMapper: {
  //   '^(\\.{1,2}/.*)\\.js$': '$1',
  // },
};
