/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.{ts,js}', '!**/node_modules/**', '!**/dist/**'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  // Handle shebang lines in source files
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        isolatedModules: true,
      },
    ],
  },
  // Ignore .d.ts files to prevent empty test suite errors
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '\\.d\\.ts$'],
  // Make sure we don't run tests on declaration files
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
};