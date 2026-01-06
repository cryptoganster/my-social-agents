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
    // Disable unbound-method for test files (common Jest pattern)
    files: ['**/*.spec.ts', '**/__tests__/**/*.ts'],
    rules: {
      '@typescript-eslint/unbound-method': 'off',
    },
  },
);
