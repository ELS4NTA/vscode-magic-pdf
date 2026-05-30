# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Magic PDF** (`vscode-magic-pdf`, publisher `ELS4NTA`): a VS Code custom editor for `.pdf` files built on a pinned `pdfjs` prebuild. Adds theme sync with VS Code, page-color inversion, AI translation on selection (via `vscode.lm`), an outline tree view, and a page/zoom status bar.

`extensionKind: ["ui"]` only — needs local FS access, no remote/web support.

## Reference docs

- [docs/KEYBOARD_SHORTCUTS.md](docs/KEYBOARD_SHORTCUTS.md) — viewer shortcuts.

## Commands

```bash
npm run check-types        # type-check host + webview (tsc -p tsconfig.host.json && -p tsconfig.webview.json)
npm run compile            # check-types + esbuild dev (sourcemaps, no minify)
npm run watch:esbuild      # incremental rebuild (what F5 uses)
npm run watch:tsc          # incremental type-check
npm run package            # check-types + esbuild --production
npm run lint               # eslint src
npm run vsce:package       # builds vscode-magic-pdf-X.Y.Z.vsix
```

- **Debug**: F5 launches the Extension Development Host with the watch task attached (see `.vscode/launch.json` + `tasks.json`). `esbuild.js` produces **2 bundles** (host → `dist/extension.js`, webview → `dist/webview.js`); the `watchMarkersPlugin` (shared instance) emits the markers only once **both** builds finish, to unblock the preLaunchTask.
- **Tests**: no suite. Validation = type-check + opening a PDF in the Extension Host.

## Critical folders

- **`lib/`** = **pdfjs prebuilt, DO NOT TOUCH**. To update: see `README.md` (replace contents, propagate changes from `lib/web/viewer.html` into the template).
- **`src/`** = extension-host TypeScript (everything except `src/webview/`).
- **`src/webview/`** = TypeScript that runs **inside the webview** (DOM environment, not Node): it bootstraps pdfjs and talks to the host via `postMessage`. Entry `bootstrap.ts`; esbuild bundles it into `dist/webview.js`.
- **`src/messages/protocol.ts`** = host↔webview type contract (pure types, no runtime imports); shared by both sides.
- **`media/`** = webview assets that are **NOT** bundled: `preview.css` and `pdfjs-polyfills.js` (vendored, like `lib/`).
- **`dist/extension.js`** + **`dist/webview.js`** = the two esbuild bundles (do not commit).

## Architecture

```
extension.ts ──► PdfProvider (CustomEditorProvider)
                    │
                    ├─► OutlineStore (singleton, per-document)
                    ├─► OutlineTreeProvider (TreeView in Explorer)
                    └─► PdfPreview (one instance per panel)
                          │
                          ├─► PreferenceStore   (memento: theme/page-colors override)
                          ├─► TranslationService (vscode.lm chat, cancels in-flight)
                          ├─► SaveRequestQueue  (host↔webview correlation by requestId)
                          ├─► PdfFileWatcher    (FS watcher + debounce + suppress window)
                          │
                          ├─► renderWebviewHtml (generates HTML with CSP + nonce)
                          │      └─► dist/webview.js (bundle of src/webview/*.ts) runs inside the webview
                          │
                          └─► routeMessage (mediator)
                                 └─► src/messages/*Handler.ts
```

### Custom editor with multiple panels

- `PdfProvider.previews: Map<uriString, Set<PdfPreview>>` — there can be several panels for the same PDF.
- `requirePreview()` picks the active panel, falling back to the first in the set. Needed because save can fire when no panel has focus.
- `activePreview()` and `notifyHostThemeChanged()` iterate via the `*allPreviews()` generator.
- Aggregated provider events: `onDidChangeActivePreview`, `onDidChangePageInfo` (with the `PdfPreview` as payload).

### Mediator/Router for webview messages

- `src/messages/protocol.ts` defines `InboundMessage` (webview→host, a **discriminated union** of 16 variants) and `OutboundMessage` (host→webview). It is **dependency-free** so the webview can share it without dragging in `vscode`/`node`. `src/messages/types.ts` is a barrel (`export * from './protocol'`) — host modules keep importing from `./types`.
- `src/messages/router.ts` maps each `type` to a handler via `HandlerMap = { [K in InboundMessageType]: HandlerFor<K> }`. The mapped type enforces exhaustiveness at compile time.
- `src/messages/context.ts` defines `HandlerContext` — a facade that `PdfPreview` builds once in its constructor (`buildContext()`) and passes to each handler. Handlers **never import** `PdfPreview`.
- **Adding a new message**:
  1. Variant in `InboundMessage` (`src/messages/protocol.ts`).
  2. Handler in `src/messages/xxxHandler.ts`.
  3. Register it in `HANDLERS` in `router.ts`.
  4. If it needs a host operation, add a method to `HandlerContext` (don't expose `PdfPreview` directly).
  5. If it sends an outbound message (host→webview), add it to `OutboundMessage` (`protocol.ts`) and post it from the relevant module in `src/webview/`.

### Configuration

- **Single access point**: `getPdfConfig()` in `pdfOptions.ts`. Nobody else calls `vscode.workspace.getConfiguration('pdf-preview')` directly.
- `pdf-preview.*` keys = the user's persistent config (`package.json` → `contributes.configuration`).
- `pdf-preview:theme-override` / `pdf-preview:page-colors-override` = overrides in `workspaceState` (memento), set by the viewer's toolbar toggles.
- Theme resolution: `resolveTheme(override, config)` → `auto|light|dark`. `resolveEffectiveTheme()` collapses `auto` to the current `vscode.window.activeColorTheme.kind` (HighContrast counts as dark).
- **`refreshOnHostThemeChange()`** re-renders only if the effective theme is `auto` — it respects a manual pin by the user.

### Webview (host → bootstrap)

- `pdfWebviewHtml.ts` loads `lib/web/viewer.html`, rewrites relative paths with `webview.asWebviewUri()`, injects a strict CSP with a **per-request nonce**, and loads a **single** `<script nonce src="dist/webview.js">`.
- `bootstrapConfig` (workerUrl, polyfillsUrl, appOptions, savedView, filename, themeIsDark, pagesInverted, uiLang) is serialized into a `<meta data-config>` and read by `parseConfig()`.
- `localResourceRoots`: only `extensionRoot` and the PDF's folder. Don't expose the whole workspace.

### Webview internals (`src/webview/`, TypeScript)

- **Style**: factory-function modules with state held in closures (`createX` → API; `installX`/`applyX` → side effects), dependencies passed by parameter (DI). No classes. The entry `bootstrap.ts` (`bootViewer()`) is the composition root that wires everything; modules **never pollute** the global scope.
- **pdfjs types**: `src/webview/pdfjs.d.ts` (a global ambient script) declares `PDFViewerApplication`/`PDFViewerApplicationOptions` and the `Pdf*` interfaces. Use those globals and `globalThis.*` (not `window.*`).
- **Host bridge**: `acquireVsCodeApi()` is narrowed to `HostBridge` (`host.ts`) → `postMessage` typed against `InboundMessage` (renaming a field in `protocol.ts` breaks the webview compile).
- **Build vs type-check**: esbuild bundles `bootstrap.ts` → `dist/webview.js` (iife/browser), **stripping types, no type-check**; the type-check is done by `tsconfig.webview.json` (DOM lib, `moduleResolution: Bundler`).

### Status bar

- A single `StatusBarItem` in `extension.ts`. Right-aligned, priority `100`, click → `magicPdf.goToPage`.
- Updated via `provider.onDidChangePageInfo`, filtered by `activePreview()` so it doesn't update on changes in non-focused panes.
- `pageInfo` is sent as a separate message (not bundled with the debounced `state`) so page updates feel instant.

### Save / Backup

- pdfjs lives in the webview. To serialize bytes, the host **requests** them via `SaveRequestQueue.request()` → `postMessage({ type: 'requestSave', requestId })`. The webview replies with `savedBytes`.
- `suppressWatcher()` is called around `vscode.workspace.fs.writeFile()` so the FS watcher doesn't reload our own bytes.
- `saveCustomDocumentAs` / `backupCustomDocument` fall back to `vscode.workspace.fs.readFile()` when there are no pending edits.

## Specific conventions

- **Commands**: `magicPdf.*` prefix. Internal ones (tree-item callbacks) are hidden from the Command Palette with `"when": "false"` in `package.json`. The `magicPdf.hasActivePdf` context key is set from `extension.ts`.
- **Logger**: a single `OutputChannel` with `{ log: true }` → `'PDF Preview'`. Methods `.info/.warn/.error/.debug`. No `console.log`.
- **Dispose**: classes that own resources implement `vscode.Disposable` and drain `disposables[]` in `dispose()`. `EventEmitter`s are always included in the array.
- **Types**: `strict: true`, `isolatedModules: true`. Avoid `any`. Casts only at boundaries (the router with `unknown` → `InboundMessage` after validating `type in HANDLERS`).
- **tsconfig (solution-style)**: the root `tsconfig.json` only has `references`; the real projects are `tsconfig.host.json` (Node) and `tsconfig.webview.json` (DOM), both extending `tsconfig.base.json` (shared quality flags). `check-types` runs both; ESLint (`projectService`) associates files by following the `references`.
