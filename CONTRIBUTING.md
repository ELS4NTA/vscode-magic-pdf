# Contributing to Magic PDF

Thanks for your interest in contributing! This document covers how to set up the
project, the conventions we follow, and how releases are published.

## Prerequisites

- Node.js 20+ and npm (the repo pins `npm@11` via `packageManager`)
- VS Code 1.91.0 or newer

## Getting started

```bash
git clone https://github.com/ELS4NTA/vscode-magic-pdf
cd vscode-magic-pdf
npm ci
```

Press **F5** in VS Code to launch the Extension Development Host with the watch
task attached, then open any `.pdf` file to load the viewer.

## Useful scripts

| Command | What it does |
| --- | --- |
| `npm run check-types` | Type-check only (`tsc --noEmit`) |
| `npm run compile` | Type-check + dev build (sourcemaps, no minify) |
| `npm run watch:esbuild` | Incremental rebuild (what F5 uses) |
| `npm run lint` | ESLint over `src` |
| `npm run package` | Production build |
| `npm run vsce:package` | Produce a `.vsix` |

There is no automated test suite — validation is **type-check + opening a PDF in
the Extension Development Host**.

## Conventions

- **Do not modify `lib/`.** It is a vendored pdfjs prebuild — see
  [Updating the PDF.js prebuild](#updating-the-pdfjs-prebuild) below.
- TypeScript is `strict`; avoid `any`. Casts only at boundaries.
- Use the `Magic PDF` output channel logger, not `console.log`.
- New webview messages go through the mediator/router (`src/messages/`). See
  `CLAUDE.md` for the architecture overview.

## Updating the PDF.js prebuild

`lib/` is a vendored [PDF.js](https://mozilla.github.io/pdf.js/) prebuild. To bump it:

1. Download the latest [Prebuilt (older browsers)](https://mozilla.github.io/pdf.js/getting_started/#download) build.
2. Extract the ZIP.
3. Overwrite `lib/*` with the extracted directories.
   - If `lib/web/viewer.html` changed, propagate those changes to the HTML template in `pdfWebviewHtml.ts`.
4. Drop the bundled sample PDF:
   - Remove `compressed.tracemonkey-pldi-09.pdf`.
   - Clear the sample reference in `lib/web/viewer.js`:
     ```js
     defaultUrl: {
       value: "", // "compressed.tracemonkey-pldi-09.pdf"
       kind: OptionKind.VIEWER
     },
     ```

See also [docs/PDF.js.md](docs/PDF.js.md) for the PDF.js architecture overview.

## Localization (i18n)

User-facing strings must be localized:

- **`package.json` contributions** → use `%key%` placeholders and add the value
  to `package.nls.json` (English) plus `package.nls.<locale>.json`.
- **Runtime strings in `src/`** → wrap with `vscode.l10n.t(...)` and add the
  translation to `l10n/bundle.l10n.<locale>.json`.

Currently shipped languages: English (base) and Spanish (`es`). The native pdfjs
UI follows VS Code's display language automatically.

## Pull request templates

A general template auto-fills every PR. For specific flows, open the PR with a
`template` query parameter (GitHub doesn't show a picker for PR templates):

| Flow | URL suffix |
| --- | --- |
| New feature | `?template=feature.md&expand=1` |
| Bug fix | `?template=bugfix.md&expand=1` |
| Release (maintainers) | `?template=release.md&expand=1` |

Append it to the compare URL, e.g.
`https://github.com/ELS4NTA/vscode-magic-pdf/compare/main...your-branch?template=feature.md&expand=1`.

## Commit messages

We follow [Conventional Commits](https://www.conventionalcommits.org/)
(`feat:`, `fix:`, `docs:`, `refactor:`, `chore:` …).

## Releasing (maintainers)

Publishing is currently **manual** (no release workflow yet). To publish a new
version to both marketplaces:

```bash
# 1. Bump version in package.json and update CHANGELOG.md
# 2. Build & sanity-check
npm run package
npm run vsce:package        # produces vscode-magic-pdf-X.Y.Z.vsix

# 3. Publish to the VS Code Marketplace (needs a Personal Access Token)
npx @vscode/vsce publish

# 4. Publish to Open VSX — reaches VSCodium, Cursor, Windsurf, Gitpod, Theia
#    (needs an Open VSX token from https://open-vsx.org)
npx ovsx publish -p <OVSX_TOKEN>
```

Tokens are personal — never commit them. See the
[vsce](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
and [Open VSX](https://github.com/eclipse/openvsx/wiki/Publishing-Extensions)
publishing guides for token setup.
