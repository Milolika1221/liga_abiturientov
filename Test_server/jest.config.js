module.exports = {
    testEnvironment: 'node',
    verbose: true,
    coveragePathIgnorePatterns: ['/node_modules/'],
    setupFilesAfterEnv: ['./__tests__/setup.js']
};