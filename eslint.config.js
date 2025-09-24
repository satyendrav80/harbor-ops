import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';

export default [
  { ignores: ['**/dist/**', '**/node_modules/**', '**/build/**', '.husky'] },
  {
    ...js.configs.recommended,
    languageOptions: {
      ...js.configs.recommended.languageOptions,
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {},
  },
];
