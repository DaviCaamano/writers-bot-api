const js = require('@eslint/js');
const tseslint = require('@typescript-eslint/eslint-plugin');
const eslintConfigPrettier = require('eslint-config-prettier');

module.exports = [
  {
    ignores: ['dist/**', 'coverage/**'],
  },
  js.configs.recommended,
  ...tseslint.configs['flat/recommended'],
  {
    files: ['src/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  eslintConfigPrettier,
];
