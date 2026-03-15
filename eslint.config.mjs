import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // 1. Base JS Recommended Rules
  eslint.configs.recommended,
  
  // 2. Base TS Recommended Rules with Type Checking
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  
  // 3. User-Specific & NestJS Overrides
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // TypeScript / Strict Typing (User Rule: no 'any')
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/no-floating-promises': 'error', // RxJS / async safety
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-misused-promises': 'error',

      // Modularity and SRP (User Rule: Max 50 lines per function)
      'max-lines-per-function': ['error', {
        max: 50,
        skipBlankLines: true,
        skipComments: true,
        IIFEs: true
      }],
      'complexity': ['error', 10], // Enforce low cyclomatic complexity for testability
      'max-classes-per-file': ['error', 1], // Modular structure - 1 class per file

      // NestJS common style relaxations (we need empty modules and DI constructors)
      '@typescript-eslint/no-extraneous-class': 'off', // NestJS modules/injectables can be empty or have only static props
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/class-literal-property-style': 'off',

      // Zod/MCP/General Quality
      'no-console': 'warn', // Discourage default console.log; use NestJS Logger
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'all'],
    },
  },
  
  // 4. Ignored directories and files
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'jest.config.js',
      'eslint.config.mjs',
      'eslint.config.js'
    ],
  }
);
