// Jest configuration for My Budget unit tests.
// The suite focuses on pure backend helpers and service logic that can be verified without a browser.
// Coverage intentionally excludes infrastructure files and static dictionaries so the report reflects business code.

module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/unit/**/*.test.js'],
  // Reset mock call history between tests so each scenario remains isolated.
  clearMocks: true,
  // Measure coverage only for application logic that is meaningful at the unit-test level.
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