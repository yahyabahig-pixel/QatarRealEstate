import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],

  test: {
    // Node, not a browser: every test here covers pure logic — the budget parser, the
    // contact-link builders, the price formatter, the query-string builder. Component tests
    // would need jsdom and @testing-library; add them (and switch this to 'jsdom') the day
    // there is one worth writing.
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    // Vitest's own transform is ESBuild's, which defaults to the CLASSIC JSX runtime and
    // then fails on any module that imports one carrying JSX with "React is not defined".
    // The automatic runtime is what the app itself is built with.
    esbuild: { jsx: 'automatic' },
  },
})
