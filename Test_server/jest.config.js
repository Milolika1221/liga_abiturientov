module.exports = {
    testEnvironment: 'node',
    verbose: true,
    coveragePathIgnorePatterns: ['/node_modules/'],
    setupFiles: ['./__tests__/setup.js'],
    testMatch: ['**/__tests__/**/*.test.js'],
    forceExit: true,
    detectOpenHandles: true,
    testTimeout: 30000
};