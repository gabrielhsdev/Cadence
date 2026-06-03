// Flat ESLint config (ESLint 9). Lightweight, non-type-checked: fast to run in
// the pre-push/CI gate. The TypeScript compiler (npm run typecheck) already
// covers type correctness and unused locals/params; ESLint adds the lint-only
// checks TS can't express — notably the React Hooks rules.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  {
    ignores: ['dist/**', 'release/**', 'build/**', 'out/**', 'node_modules/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // tsconfig already enforces noUnusedLocals/Parameters; avoid a duplicate
      // (and let leading-underscore args be intentionally unused).
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  }
);
