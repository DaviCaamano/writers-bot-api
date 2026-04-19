import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/src/__tests__/**/*.test.ts'],
  setupFiles: ['./src/config/jest-setup.ts'],
  setupFilesAfterEnv: ['./src/config/jest-mocks.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  resetMocks: true,
  silent: false,
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/__tests__/**', '!src/index.ts'],
};

export default config;
