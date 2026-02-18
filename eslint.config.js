import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  // Global ignores
  { ignores: ['dist/', 'public/', 'v1/', 'node_modules/'] },

  // Base JS recommended rules
  js.configs.recommended,

  // TypeScript type-checked rules
  ...tseslint.configs.recommendedTypeChecked,

  // TypeScript parser options (applied to TS/TSX files)
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // React Hooks plugin
  {
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },

  // Accessibility rules
  jsxA11y.flatConfigs.recommended,

  // React Refresh plugin (Vite HMR safety)
  {
    plugins: { 'react-refresh': reactRefresh },
    rules: {
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  // Project-specific rule overrides
  {
    rules: {
      // Enforce consistent type imports (already the convention)
      '@typescript-eslint/consistent-type-imports': 'error',

      // Allow unused vars prefixed with _
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

      // Allow non-null assertions (used on document.getElementById('root')!)
      '@typescript-eslint/no-non-null-assertion': 'off',

      // Allow fire-and-forget promises with void prefix
      '@typescript-eslint/no-floating-promises': ['error', { ignoreVoid: true }],

      // Allow async event handlers in JSX attributes
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],

      // Allow template literal expressions (used everywhere)
      '@typescript-eslint/restrict-template-expressions': 'off',
    },
  },

  // Prettier must be last — disables formatting rules
  prettierConfig,
);
