/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  extends: [
    `@remix-run/eslint-config`,
    `@remix-run/eslint-config/node`,
    `@remix-run/eslint-config/jest-testing-library`,
    `eslint:recommended`,
    // `plugin:@typescript-eslint/recommended`,
    `plugin:react/recommended`,
    `plugin:prettier/recommended`,
  ],
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 2022,
    requireConfigFile: false,
    sourceType: `module`,
    ecmaFeatures: {
      jsx: true,
    },
  },
  settings: {
    react: {
      version: `detect`,
    },
    // we're using vitest which has a very similar API to jest
    // (so the linting plugins work nicely), but it means we have to explicitly
    // set the jest version.
    jest: {
      version: 28,
    },
  },
  parser: `@typescript-eslint/parser`,
  plugins: [`react`, `prettier`],
  rules: {
    quotes: [`error`, `backtick`],
  },
};
