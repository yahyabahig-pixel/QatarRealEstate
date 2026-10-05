import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],

  // TOP LEVEL, not inside `test`. Vitest reads this key from the Vite config root; nested
  // under `test` it is silently ignored, which is how a config that looked like it handled
  // JSX still failed with "React is not defined" the first time a test imported a module
  // that reaches one. The app build keeps using plugin-react's transform regardless.
  esbuild: { jsx: 'automatic' },

  test: {
    // Node, not a browser: every test here covers pure logic — the budget parser, the
    // contact-link builders, the price formatter, the query-string builder. Component tests
    // would need jsdom and @testing-library; add them (and switch this to 'jsdom') the day
    // there is one worth writing.
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,jsx}'],
  },
})
