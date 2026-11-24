const path = require('node:path');

module.exports = {
  projects: ['mongo'].map((name) => ({
    displayName: name,
    rootDir: path.resolve(__dirname, '..'),
    testEnvironment: 'node',
    transform: {},
    testMatch: [`<rootDir>/test/${name}.integration.spec.mjs`],
    restoreMocks: true,
  })),
};
