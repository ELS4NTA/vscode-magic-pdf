const esbuild = require('esbuild');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

// Emits markers that the problemMatcher in .vscode/tasks.json reads to detect
// build completion and unblock the preLaunchTask. A single shared instance
// coordinates both bundles via `active`: "started" prints when the first build
// of a round begins, "finished" only once the last in-flight build ends — so
// F5 waits for both bundles, not just whichever finishes first.
let active = 0;
/** @type {import('esbuild').Plugin} */
const watchMarkersPlugin = {
  name: 'watch-markers',
  setup(build) {
    build.onStart(() => {
      if (active === 0) console.log('[watch] build started');
      active += 1;
    });
    build.onEnd((result) => {
      for (const { text, location } of result.errors) {
        console.error(`✘ [ERROR] ${text}`);
        if (location) console.error(`    ${location.file}:${location.line}:${location.column}:`);
      }
      active -= 1;
      if (active === 0) console.log('[watch] build finished');
    });
  },
};

// Two independent bundles: the extension host (Node/CJS) and the webview
// viewer script (browser/IIFE, a single <script> so the CSP stays unchanged).
const configs = [
  {
    entryPoints: ['src/extension.ts'],
    bundle: true,
    format: 'cjs',
    platform: 'node',
    target: 'node18',
    outfile: 'dist/extension.js',
    external: ['vscode'],
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    logLevel: 'warning',
    plugins: [watchMarkersPlugin],
  },
  {
    entryPoints: ['src/webview/bootstrap.ts'],
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: 'es2022',
    outfile: 'dist/webview.js',
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    logLevel: 'warning',
    plugins: [watchMarkersPlugin],
  },
];

async function main() {
  const ctxs = await Promise.all(configs.map((c) => esbuild.context(c)));
  if (watch) {
    await Promise.all(ctxs.map((c) => c.watch()));
  } else {
    await Promise.all(ctxs.map((c) => c.rebuild()));
    await Promise.all(ctxs.map((c) => c.dispose()));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
