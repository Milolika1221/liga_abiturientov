jest.mock('../db', () => ({
    db: {
        query: jest.fn(),
        connect: jest.fn()
    },
    generateToken: jest.fn(() => 'mock-token'),
    generatePassword: jest.fn(() => 'mock-pass'),
    hashPassword: jest.fn((pwd) => ({ salt: 'salt', hash: 'hash' })),
    verifyPassword: jest.fn((pwd, salt, hash) => pwd === 'correct123'),
    encryptData: jest.fn((text) => text ? `enc_${text}` : null),
    decryptData: jest.fn((text) => text ? text.replace(/^enc_/, '') : null)
}));

jest.mock('../config/smtp', () => ({
    sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
    verifyConnection: jest.fn().mockResolvedValue(true)
}));