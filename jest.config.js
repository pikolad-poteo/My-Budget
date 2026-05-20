module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/unit/**/*.test.js'],
  clearMocks: true,
  collectCoverageFrom: [
    'scr/**/*.js',
    '!scr/db.js',
    '!scr/checkDatabase.js',
    '!scr/mail.service.js',
    '!scr/emailVerification.service.js',
    '!scr/passwordReset.service.js'
  ]
};
