// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import importPlugin from 'eslint-plugin-import';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    plugins: {
      import: importPlugin,
    },
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-enum-comparison': 'warn',
      "prettier/prettier": ["error", { endOfLine: "auto" }],
      // Prohibir imports relativos que deberían usar path aliases
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../ingestion/*', '../../ingestion/*', '../../../ingestion/*', '../../../../ingestion/*'],
              message: 'Use @/ingestion/* instead of relative imports for ingestion modules',
            },
            {
              group: ['../shared/*', '../../shared/*', '../../../shared/*', '../../../../shared/*'],
              message: 'Use @/shared/* instead of relative imports for shared modules',
            },
          ],
        },
      ],
    },
  },
  {
    // Disable strict type checking for test files (common Jest/testing patterns with mocks)
    // Tests use mocks and dynamic types extensively, so we disable these rules entirely
    files: ['**/*.spec.ts', '**/__tests__/**/*.ts'],
    rules: {
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/strict-boolean-expressions': 'off',
    },
  },
);
