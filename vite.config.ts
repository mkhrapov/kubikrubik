import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';

// The app is deployed into a subfolder of another site on a static host that
// cannot serve `index.html`, so the entry file has a custom name and every
// asset URL is relative to it.
export const ENTRY_HTML = 'rubik_cube.html';

/**
 * cubejs's lib/solve.js reads `this.Cube || require('./cube')` at module top
 * level. Bundled as an ES module (main thread or worker) `this` is undefined,
 * so it throws. Patch it to always `require('./cube')`. Applied both to the
 * production build and to dev-time dependency pre-bundling.
 */
function patchCubejs(): Plugin {
  return {
    name: 'patch-cubejs-top-level-this',
    transform(code, id) {
      if (!/[\\/]cubejs[\\/]lib[\\/]solve\.js$/.test(id)) return null;
      const patched = code.replace("this.Cube || require('./cube')", "require('./cube')");
      if (patched === code) this.warn('cubejs solve.js did not contain the expected snippet');
      return { code: patched, map: null };
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [patchCubejs()],
  worker: {
    // The solver worker is bundled separately and is where cubejs is imported.
    format: 'es',
    plugins: () => [patchCubejs()],
  },
  build: {
    rollupOptions: {
      input: fileURLToPath(new URL(`./${ENTRY_HTML}`, import.meta.url)),
    },
  },
  server: {
    open: `/${ENTRY_HTML}`,
  },
  optimizeDeps: {
    include: ['cubejs'],
    rolldownOptions: {
      plugins: [patchCubejs()],
    },
  },
});
