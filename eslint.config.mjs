/**
 * ESLint flat config for the whole monorepo.
 *
 * - client/** uses Next.js core-web-vitals + React rules
 * - server/** uses plain Node.js rules (CommonJS)
 *
 * Run: npm run lint   /   npm run lint:fix
 */
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import globals from 'globals';

const nextConfigs = (
  Array.isArray(nextCoreWebVitals) ? nextCoreWebVitals : [nextCoreWebVitals]
).map((config) => ({ ...config, files: ['client/**/*.{js,jsx}'] }));

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/coverage/**',
      'deferred/**',
      'package-lock.json',
    ],
  },

  ...nextConfigs,

  {
    files: ['client/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // App Router project: there is no legacy `pages/` directory to resolve.
      '@next/next/no-html-link-for-pages': 'off',
    },
  },

  {
    files: ['server/**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      ecmaVersion: 'latest',
      globals: globals.node,
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'off',
    },
  },

  {
    files: ['*.js', '*.mjs'],
    languageOptions: { globals: globals.node },
  },
];
