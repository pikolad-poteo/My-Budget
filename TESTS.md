# Testing Documentation for My Budget

This document describes the automated testing system of the **My Budget** web application. It is intended to be added to the repository next to `README.md` and explains which tests are included in the project, how to run them, what parts of the application they cover, and how to interpret the results.

My Budget is a full-stack web application for managing personal and family budgets. Because the application includes authentication, family roles, CRUD operations, database interaction, calendar events, wishlist items, multilingual interface elements, and user-facing UI flows, testing is divided into two levels:

- **Unit tests** — fast tests for backend business logic, services, middleware, validation helpers, and utility functions.
- **End-to-End tests** — Playwright browser scenarios that test the application from a user's point of view: login, page navigation, creating, editing, and deleting data.

## Testing tools

The project uses two main testing tools.

| Tool | Purpose | Configuration |
|---|---|---|
| Jest | Unit tests for backend logic and utility functions | `jest.config.js` |
| Playwright | End-to-End tests through the Chromium browser | `playwright.config.js` |

The tests are located in the `tests/` directory:

```text
My-Budget/
├── tests/
│   ├── unit/      # Jest unit tests
│   └── e2e/       # Playwright end-to-end tests
├── jest.config.js
├── playwright.config.js
└── package.json
```

## NPM scripts

The `package.json` file contains separate commands for running the application and tests:

```bash
npm start
npm run dev
npm test
npm run test:e2e
```

Command descriptions:

| Command | Description |
|---|---|
| `npm start` | Starts the application using `node server.js` |
| `npm run dev` | Starts the application using `nodemon` for development |
| `npm test` | Runs Jest unit tests |
| `npm run test:e2e` | Runs Playwright E2E tests |

## Environment preparation

Before running tests, install the project dependencies:

```bash
npm install
```

For Playwright, browser binaries also need to be installed after installing dependencies:

```bash
npx playwright install
```

If Playwright browsers have already been installed earlier, this command usually does not need to be repeated. If an E2E test run fails with an error such as `Executable doesn't exist`, run the command above again.

## Database preparation

E2E tests work with the real application and a real local database. Therefore, before running E2E tests, the test SQL dump must be imported:

```bash
mysql -u root -p < my_budget.sql
```

If the local MySQL `root` user does not use a password:

```bash
mysql -u root < my_budget.sql
```

The SQL dump contains demo test data required for application testing:

- test users;
- family workspace;
- Owner, Editor, and Viewer roles;
- categories;
- transactions;
- wishlist items;
- calendar events.

## Environment variables

For local application startup and E2E testing, an `.env` file is required in the project root. Example minimal configuration:

```env
PORT=3000
APP_URL=http://localhost:3000
NODE_ENV=development

SESSION_SECRET=replace-with-a-long-random-secret

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=my_budget

MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=your-email@example.com
MAIL_PASSWORD=your-mail-app-password
MAIL_FROM="My Budget <your-email@example.com>"
```

Real SMTP credentials are not required for unit tests because email services are mocked during testing. Real or test SMTP credentials are only needed for manual verification of email verification and password reset flows.

## Test accounts

Playwright E2E tests use the Owner account from the demo database by default:

| Role | Email | Password |
|---|---|---|
| Owner | `admin@test.local` | `DemoOwner2026!` |
| Editor | `admin@myshop.local` | `DemoEditor2026!` |
| Viewer | `viewer@test.local` | `ViewerDemo2026!` |

The login used by E2E tests can be overridden through environment variables:

```bash
E2E_USER_EMAIL=admin@test.local E2E_USER_PASSWORD=DemoOwner2026! npm run test:e2e
```

On Windows PowerShell:

```powershell
$env:E2E_USER_EMAIL="admin@test.local"
$env:E2E_USER_PASSWORD="DemoOwner2026!"
npm run test:e2e
```

## Unit tests

Unit tests are located in:

```text
tests/unit/
```

They are run with:

```bash
npm test
```

Unit tests check separate functions and services without opening a browser. They actively use mocks so that the tests do not depend on a real database, SMTP server, or external services.

### Jest configuration

Configuration file:

```text
jest.config.js
```

Main settings:

```js
testEnvironment: 'node'
testMatch: ['**/tests/unit/**/*.test.js']
clearMocks: true
```

This means that Jest runs only files from `tests/unit/`, uses the Node.js environment, and clears mocks between tests.

### Covered unit modules

The current project version contains 12 unit test files and 97 individual checks.

| File | Number of tests | What is tested |
|---|---:|---|
| `auth.validation.test.js` | 8 | Email normalization, email format, password requirements |
| `budget.permissions.test.js` | 8 | Owner, Editor, and Viewer permissions for budget pages |
| `category.utils.test.js` | 8 | Category name cleanup, type, scope, color, icon, redirect, flash |
| `emailVerification.service.test.js` | 5 | Creating, sending, and confirming an email verification token |
| `family.activity.test.js` | 7 | Writing and reading family activity and member activity |
| `family.permissions.test.js` | 6 | Family role normalization and role-based access |
| `family.service.test.js` | 15 | Family read helpers, personal workspace, family profile, members |
| `middleware.test.js` | 4 | `attachUser` and `requireAuth` |
| `passwordReset.service.test.js` | 6 | Password reset token, valid token lookup, token usage |
| `token.service.test.js` | 5 | Secure token generation, SHA-256 hash, expiration date |
| `transaction.utils.test.js` | 9 | Transaction data cleanup, filters, redirect, flash, date range |
| `wishlist.utils.test.js` | 16 | Wishlist sanitizers, folders, filters, redirects, workspace queries, summary |

### What unit tests check

Unit tests cover the main parts of the application's business logic:

- email and password validation;
- strong password requirements;
- middleware protection for authenticated pages;
- access rights for family roles;
- restriction of budget editing for Viewer users;
- personal and family workspace logic;
- safe sanitization of user input;
- redirect URL generation after user actions;
- flash messages stored in session;
- token generation and hashing;
- email verification flow;
- password reset flow;
- wishlist folder logic;
- wishlist summary calculation;
- family activity feed;
- transaction operations through a mocked database connection.

### Why unit tests use mocks

The database and email services are not called directly in unit tests. Instead, mocks are used:

```js
jest.mock('../../scr/db', () => ({
  getConnection: jest.fn()
}));
```

This approach is used to:

- test business logic instead of local MySQL availability;
- keep unit tests fast;
- avoid sending real emails during testing;
- test error handling, rollback, and connection release without damaging real data;
- make tests stable and repeatable.

## Unit coverage

To run unit tests with a coverage report, use:

```bash
npm test -- --coverage
```

After the run, Jest creates the following directory:

```text
coverage/
```

The HTML report can be opened here:

```text
coverage/lcov-report/index.html
```

In `jest.config.js`, coverage is configured for files in `scr/**/*.js`, but some infrastructure files are excluded from total coverage because they do not contain pure business logic or depend on external runtime environment.

Excluded from unit coverage:

```text
scr/db.js
scr/checkDatabase.js
scr/mail.service.js
scr/emailVerification.service.js
scr/passwordReset.service.js
scr/i18n/**
scr/**/translations/**
```

Reasons for exclusion:

- `scr/db.js` depends on a real MySQL connection;
- `scr/checkDatabase.js` is related to database schema and runtime initialization;
- `scr/mail.service.js` depends on SMTP;
- translation dictionaries do not contain executable business logic;
- email/password reset services are partially tested through mocks, but they are excluded from total coverage because of their dependency on external runtime flow.

## End-to-End tests

E2E tests are located in:

```text
tests/e2e/
```

They are run with:

```bash
npm run test:e2e
```

Playwright starts the real Express application, opens Chromium, and executes scenarios in the same way a regular user would interact with the application.

### Playwright configuration

Configuration file:

```text
playwright.config.js
```

Main settings:

```js
testDir: './tests/e2e'
timeout: 30 * 1000
expect.timeout: 5 * 1000
fullyParallel: false
workers: 1
reporter: 'list'
trace: 'on-first-retry'
```

Important details:

- tests run sequentially, not in parallel;
- one worker is used;
- the main browser project is `chromium`;
- the application is started automatically with `npm start`;
- `NODE_ENV=test` is used during the test run;
- trace is saved on the first retry, which helps investigate failed tests.

Sequential execution is used intentionally because E2E tests work with one shared local database and perform real CRUD operations. This reduces the risk of conflicts between tests.

### Base URL

By default, Playwright uses:

```text
http://127.0.0.1:3000
```

The URL can be overridden:

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3001 npm run test:e2e
```

The port can also be overridden:

```bash
PORT=3001 npm run test:e2e
```

## Covered E2E scenarios

The current project version contains 9 E2E test files and 21 browser checks.

| File | Number of tests | What is tested |
|---|---:|---|
| `auth.flow.spec.js` | 3 | Successful login, error on wrong password, logout and dashboard protection |
| `auth.smoke.spec.js` | 4 | Login page, guest redirect, register/recovery links, validation feedback |
| `calendar.crud.spec.js` | 1 | Creating, editing, and deleting a calendar event |
| `categories.crud.spec.js` | 1 | Creating and deleting a test expense category |
| `family.behavior.spec.js` | 2 | Family controls, activity expand/filter/sort without changing data |
| `navigation.smoke.spec.js` | 2 | Navigation through main pages and opening the account page |
| `transactions.crud.spec.js` | 1 | Creating, editing, and deleting an expense transaction |
| `ui.interactions.spec.js` | 6 | Opening/closing create panels, advanced filters, calendar view switch |
| `wishlist.crud.spec.js` | 1 | Creating, editing, and deleting a wishlist item |

### Main E2E coverage areas

E2E tests cover the user scenarios that are most important for demonstrating the application:

- user authentication;
- protection of pages from guest users;
- logout;
- navigation between main pages;
- dashboard access;
- account page access;
- Categories CRUD;
- Transactions CRUD;
- Wishlist CRUD;
- Calendar CRUD;
- Family page behavior;
- opening and closing creation forms;
- advanced filters on the Transactions page;
- Calendar month/day view switching;
- verification that the key page containers are actually displayed.

## Why E2E tests create temporary data

CRUD tests create data with unique names using `Date.now()`, for example:

```js
const uniqueId = Date.now();
const createdTitle = `E2E Wishlist ${uniqueId}`;
```

This is done to:

- avoid conflicts with existing demo records;
- easily find the exact record created by the test;
- safely delete only test data;
- keep tests repeatable.

After checking the update flow, tests delete the records they created. This helps keep the database clean from test objects.

## Recommended test run order

Full local verification before a commit:

```bash
npm install
npx playwright install
mysql -u root -p < my_budget.sql
npm test
npm test -- --coverage
npm run test:e2e
```

If the database has already been imported and dependencies are installed, it is enough to run:

```bash
npm test
npm run test:e2e
```

## Quick smoke check

To quickly check that the main logic is not broken:

```bash
npm test
```

To check browser-based user scenarios:

```bash
npm run test:e2e
```

## Playwright reports

The project may generate the following directory:

```text
playwright-report/
```

It contains the Playwright HTML report after running tests with the HTML reporter or after viewing the results. When tests fail, additional diagnostic data can also appear in:

```text
test-results/
```

This directory may contain traces, screenshots, error context, and other debugging information.

To open the Playwright report, use:

```bash
npx playwright show-report
```

## Common problems and solutions

### 1. Playwright browser executable does not exist

The error can look like this:

```text
browserType.launch: Executable doesn't exist
Looks like Playwright was just installed or updated.
Please run: npx playwright install
```

Solution:

```bash
npx playwright install
```

### 2. E2E tests cannot log into the account

Check the following:

- whether `my_budget.sql` has been imported;
- whether the `admin@test.local` user exists;
- whether the password is `DemoOwner2026!`;
- whether `DB_NAME` in `.env` matches the imported database;
- whether MySQL/MariaDB is running.

### 3. The application does not start during E2E tests

Check manual startup first:

```bash
npm start
```

If the application does not start manually, Playwright will not be able to start it either.

Common causes:

- missing `.env` file;
- incorrect database credentials;
- database has not been imported;
- port is already in use;
- dependencies have not been installed.

### 4. Jest is not found

Error:

```text
jest: not found
```

Solution:

```bash
npm install
```

### 5. E2E test fails after a previous failed run

If a test failed before cleanup and left a temporary record, it is better to restore the database from the dump:

```bash
mysql -u root -p < my_budget.sql
```

Then run E2E tests again:

```bash
npm run test:e2e
```

## What is not fully covered by tests

Automated tests cover the main application flows, but they do not fully replace manual testing.

Current limitations of the test system:

- there is no separate visual regression testing;
- there is no load testing;
- there is no dedicated security penetration testing;
- email delivery in unit tests is checked through mocks, not through a real SMTP server;
- Playwright checks the main CRUD and UI flows, but not every possible filter combination;
- multilingual UI is checked partially through page availability, but not through full snapshots of all translations;
- responsive layout is not tested through separate mobile/tablet Playwright projects;
- tests are not run in parallel because they use a shared local database.

For a diploma project, this is a realistic and appropriate level of automation: the tests check critical scenarios, access permissions, authentication, CRUD operations, and main UI interactions.

## Manual testing after automated tests

After successful `npm test` and `npm run test:e2e` runs, it is recommended to manually check:

- new user registration;
- real verification email delivery;
- password reset through email;
- email change in Account Management;
- password change;
- avatar upload and removal;
- language switching between English / Russian / Estonian;
- Viewer restrictions in the family workspace;
- appearance of main pages after switching filters;
- application layout on different screen sizes.

## General project coverage

Testing covers the following major My Budget modules:

| Module | Unit tests | E2E tests | Comment |
|---|---|---|---|
| Authentication | Yes | Yes | Validation, login, logout, guest protection are tested |
| Account security | Yes | Partially | Password reset and email tokens are covered by unit tests |
| Middleware | Yes | Through pages | `requireAuth` and dashboard protection are tested |
| Family permissions | Yes | Yes | Roles and Family page behavior are tested |
| Categories | Yes | Yes | Unit sanitizers + E2E create/delete |
| Transactions | Yes | Yes | Unit sanitizers + E2E create/update/delete |
| Wishlist | Yes | Yes | Unit folder/workspace logic + E2E CRUD |
| Calendar | Partially | Yes | E2E create/update/delete event |
| Navigation | Not required | Yes | Navigation between main pages is tested |
| UI panels | Not required | Yes | Create panels and advanced filters are tested |
| i18n | Excluded from coverage | Partially/manual | Dictionaries do not contain business logic |
| Database schema | Partially through E2E | Yes | Tested through real application startup |

## Summary

My Budget has a two-level testing system:

- **97 unit tests** check internal business logic, validation, permissions, services, middleware, and utility functions.
- **21 E2E tests** check real browser-based user scenarios through Playwright.
- The full system contains **118 automated checks**.

This approach helps quickly find errors in individual functions through Jest and additionally verifies that the application works as a complete system through Playwright.

Before the final commit, it is recommended to run:

```bash
npm test
npm run test:e2e
```

If both commands pass successfully, it means that the application's main critical scenarios work correctly: authentication, page protection, navigation, categories, transactions, wishlist, calendar, family behavior, and key UI interactions.
