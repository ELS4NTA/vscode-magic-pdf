import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Unit tests run in plain Node — no VS Code, no Electron, no PDF.js. The only
// non-resolvable import in the modules under test is `vscode` (provided by the
// editor at runtime), so we alias it to a hand-written stub. Everything else is
// real application code.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
  resolve: {
    alias: {
      vscode: fileURLToPath(new URL('./test/__mocks__/vscode.ts', import.meta.url)),
    },
  },
});
