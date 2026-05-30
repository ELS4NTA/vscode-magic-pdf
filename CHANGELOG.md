# Changelog

All notable changes to **Magic PDF** are documented here. The format is
based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
