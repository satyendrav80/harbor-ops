module.exports = {
  root: true,
  env: { node: true, es2022: true, browser: true },
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier',
  ],
  settings: { react: { version: 'detect' } },
  ignorePatterns: ['**/dist/**', '**/node_modules/**', '**/build/**'],
  overrides: [
    { files: ['frontend/**/*.{ts,tsx}'], env: { browser: true } },
    { files: ['backend/**/*.ts'], env: { node: true } }
  ],
};
