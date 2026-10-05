import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// index.html writes the absolute site URL into the canonical link, og:url, og:image and the
// JSON-LD block — `href="%VITE_SITE_URL%/"` and friends. When that variable is missing or
// empty the href collapses to "/", Vite reads a root-relative href on a <link> as an ASSET
// to bundle, resolves it to the web root, and the build dies with:
//
//     [plugin vite:build-html] Error: EISDIR: illegal operation on a directory, read
//
// Nothing in that message names the variable. It never showed up locally because
// docker-compose always passes PUBLIC_ORIGIN through, so the only ways to hit it were a
// plain `docker build` and CI — where it failed on every single push, with the frontend
// image step red and the persistence job skipped behind it for weeks.
//
// Normalizing here rather than in the Dockerfile covers every way the app gets built, and
// the trailing slash goes too, so "https://site.qa/" cannot become "https://site.qa//".
function normalizeSiteUrl(raw) {
  const v = String(raw ?? '').trim()
  return /^https?:\/\/[^/]/.test(v) ? v.replace(/\/+$/, '') : 'http://localhost'
}

export default defineConfig(({ mode }) => {
  process.env.VITE_SITE_URL = normalizeSiteUrl(process.env.VITE_SITE_URL)

  return {
    plugins: [react(), tailwindcss()],

    // TEST MODE ONLY, and top level rather than inside `test`.
    //
    // Two separate traps here. Vitest reads `esbuild` from the config ROOT — nested under
    // `test` it is silently ignored, which is how a config that looked like it handled JSX
    // still failed with "React is not defined" the first time a test imported a module that
    // reaches a .jsx file. But at the root it also reaches the production build, where Vite
    // 8 transforms with oxc and prints "Both esbuild and oxc options were set" on every
    // build before ignoring it. Scoping it to the test run satisfies Vitest and leaves the
    // real build quiet; plugin-react handles JSX there.
    ...(mode === 'test' ? { esbuild: { jsx: 'automatic' } } : {}),

    test: {
      // Node, not a browser: every test here covers pure logic — the budget parser, the
      // contact-link builders, the price formatter, the query-string builder. Component
      // tests would need jsdom and @testing-library; add them (and switch this to 'jsdom')
      // the day there is one worth writing.
      environment: 'node',
      include: ['src/**/*.{test,spec}.{js,jsx}'],
    },
  }
})

// Exported so a test can pin the rule without running a build.
export { normalizeSiteUrl }
