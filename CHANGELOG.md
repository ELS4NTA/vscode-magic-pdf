# Changelog

All notable changes to **Magic PDF** are documented here. The format is
based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0](https://github.com/ELS4NTA/vscode-magic-pdf/compare/v1.1.0...v1.2.0) (2026-06-01)


### Features

* **docs:** add sample PDF document for testing ([6c0b70b](https://github.com/ELS4NTA/vscode-magic-pdf/commit/6c0b70b4040f0e60068d8c99fc4d019a4ef0c082))
* **docs:** add sample PDF document for testing ([f10ce10](https://github.com/ELS4NTA/vscode-magic-pdf/commit/f10ce1042f2a131b014a0ccf59b5cf79a3aeeb46))

## [1.1.0](https://github.com/ELS4NTA/vscode-magic-pdf/compare/v1.0.0...v1.1.0) (2026-06-01)


### Features

* **localization:** add english and spanish localization ([c19b1bb](https://github.com/ELS4NTA/vscode-magic-pdf/commit/c19b1bb1145f266b69aecd89904d5bd52ff4cdf8))
* **pdf:** add pdf custom editor with webview viewer ([7e1da59](https://github.com/ELS4NTA/vscode-magic-pdf/commit/7e1da5994b8ea24116f82c618503ae69e7762b95))

## [1.0.0] - 2026-05-31

First public release of **Magic PDF** — a VS Code custom editor for PDF
files, rebuilt on a pinned [PDF.js](https://mozilla.github.io/pdf.js/) prebuild.

### Added

- Native `.pdf` custom editor that opens documents in a regular editor tab.
- **Theme sync** with VS Code (light / dark / high-contrast), with a manual override from the toolbar.
- **Page-color inversion**, independent of the active theme.
- **AI translation on selection** via `vscode.lm` (GitHub Copilot).
- **Outline tree view** in the Explorer for document bookmarks.
- **Page & zoom status bar** with click-to-go-to-page.
- **Annotations & forms** with save and hot-exit backup support.
- 15 `magicPdf.*` settings (default cursor, zoom, sidebar, scroll/spread modes, text layer, annotations, theme, scripting, permissions, hardware acceleration, toolbar density, and more).
- Localization: English (base) and Spanish.

[1.0.0]: https://github.com/ELS4NTA/vscode-magic-pdf/releases/tag/v1.0.0
