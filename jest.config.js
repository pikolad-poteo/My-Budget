module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/unit/**/*.test.js'],
  clearMocks: true,
  collectCoverageFrom: [
    'scr/**/*.js',

    // Exclude database and infrastructure files from unit coverage.
    '!scr/db.js',
    '!scr/checkDatabase.js',
    '!scr/mail.service.js',

    // These services are tested through mocked/unit scenarios,
    // but excluded from global coverage because they depend on external email/runtime flows.
    '!scr/emailVerification.service.js',
    '!scr/passwordReset.service.js',

    // Exclude translation dictionaries from coverage because they do not contain business logic.
    '!scr/i18n/**',
    '!scr/**/translations/**'
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/scr/i18n/',
    '/scr/i18n/translations/'
  ]
};