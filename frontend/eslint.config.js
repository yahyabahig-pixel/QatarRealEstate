import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

// ---------------------------------------------------------------------------------------
// There was no linting at all, which is why a handful of the bugs in the review existed:
// a variable destructured and never used, an effect whose dependency array did not match
// what it read, a duplicate const. None of those survive this file.
//
// Deliberately NOT a wall of style rules. Every rule here catches something that can
// actually be wrong at runtime; formatting opinions belong in an editor, not in a gate
// that has to stay green.
// ---------------------------------------------------------------------------------------
export default [
  { ignores: ['dist/**', 'node_modules/**', 'public/vendor/**'] },

  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      globals: { ...globals.browser, ...globals.es2021 },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,

      // Without these, no-unused-vars does not count a JSX tag as a use, and every single
      // imported component is reported as unused — 247 warnings that are all wrong.
      'react/jsx-uses-vars': 'error',
      'react/jsx-uses-react': 'error',

      // react-hooks v7 rules that are architectural opinions rather than defect detectors.
      // set-state-in-effect flags the ordinary "fetch on mount, setState when it arrives"
      // pattern this whole app is built on; turning it into an error would mean rewriting
      // working data loading to satisfy a linter. The rules that catch actual mistakes —
      // rules-of-hooks, exhaustive-deps — stay on.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/static-components': 'warn',

      // An unused variable is usually a rename that was only half done. Names starting with
      // an underscore, and caught errors, are the deliberate exceptions.
      'no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrors: 'none',
      }],

      // Fast Refresh only works when a module exports components and nothing else. A
      // warning, not an error: several files here legitimately export a constant next to a
      // component.
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // console.error and console.warn are how this app surfaces real failures; a stray
      // console.log is debris.
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  {
    files: ['**/*.{test,spec}.{js,jsx}'],
    languageOptions: { globals: { ...globals.node } },
  },

  {
    files: ['vite.config.js', 'eslint.config.js'],
    languageOptions: { globals: { ...globals.node } },
  },
]
