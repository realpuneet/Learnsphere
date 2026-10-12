export default {
  testEnvironment: 'node',
  transform: {},
  testMatch: ['<rootDir>/tests/integration/**/*.test.js'],
  setupFiles: ['<rootDir>/tests/integration/env.js'],
  testTimeout: 60000,
};
