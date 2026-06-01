# Magic PDF

View, annotate and translate PDF files inside VS Code — dark mode, page-color inversion and AI translation.

[![CI](https://img.shields.io/github/actions/workflow/status/ELS4NTA/vscode-magic-pdf/ci.yml?branch=main&label=CI)](https://github.com/ELS4NTA/vscode-magic-pdf/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/ELS4NTA/vscode-magic-pdf)](./LICENSE)
[![Version](https://img.shields.io/visual-studio-marketplace/v/ELS4NTA.vscode-magic-pdf?label=VS%20Marketplace)](https://marketplace.visualstudio.com/items?itemName=ELS4NTA.vscode-magic-pdf)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/ELS4NTA.vscode-magic-pdf)](https://marketplace.visualstudio.com/items?itemName=ELS4NTA.vscode-magic-pdf)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/ELS4NTA.vscode-magic-pdf)](https://marketplace.visualstudio.com/items?itemName=ELS4NTA.vscode-magic-pdf&ssr=false#review-details)

<!-- TODO(captura): reemplazar por un GIF/imagen PROPIO. El anterior era de otra
     extensión (heredado del fork). Sugerido: demo de theme sync + traducción IA +
     outline. Guárdalo en docs/images/ y referencia la ruta relativa aquí. -->
![Magic PDF](docs/images/demo.gif)

## Features

- **Native `.pdf` custom editor** — opens PDFs in a regular editor tab, built on a pinned [PDF.js](https://mozilla.github.io/pdf.js/) prebuild.
- **Theme sync** — the viewer follows your VS Code theme (light / dark / high-contrast) automatically, or pin it from the toolbar.
- **Page-color inversion** — invert page colors independently of the theme for comfortable dark reading.
- **AI translation on selection** — select text in the PDF and translate it inline using a language model via `vscode.lm` (GitHub Copilot).
- **Outline tree view** — navigate the document's bookmarks from a dedicated Outline view in the Explorer.
- **Page & zoom status bar** — current page and zoom in the status bar; click to jump to a page.
- **Annotations & forms** — fill forms and add annotations (highlight, ink, free text, …), with save and hot-exit backup support.

## Requirements

- **VS Code `^1.91.0`** or newer.
- **AI translation** requires an available `vscode.lm` chat model — install and sign in to **GitHub Copilot**. Everything else works without it; only translation is disabled.
- Runs as a **UI extension** (`extensionKind: ["ui"]`): it needs local filesystem access and does not support virtual/remote workspaces.

## Extension Settings

All settings live under the `magicPdf.*` namespace.

| Setting | Default | Description |
| --- | --- | --- |
| `magicPdf.theme` | `auto` | Page color theme. `dark` forces a dark background/foreground via PDF.js page colors. |
| `magicPdf.default.cursor` | `select` | The default cursor tool for preview. |
| `magicPdf.default.scale` | `auto` | Default zoom. Allowed: `auto`, `page-actual`, `page-fit`, `page-width`, or a numeric scale (`1.0` = 100%). |
| `magicPdf.default.sidebar` | `none` | Sidebar view shown on load. |
| `magicPdf.default.scrollMode` | `vertical` | The default scroll mode. |
| `magicPdf.default.spreadMode` | `none` | The default spread mode. |
| `magicPdf.default.textLayer` | `enable` | Selectable text layer over the PDF. `enablePermissions` honors the PDF's copy-permission flag. |
| `magicPdf.default.annotations` | `enableForms` | Render annotations (links, forms, …). `enableStorage` keeps in-session annotation edits. |
| `magicPdf.default.annotationEditor` | `none` | Annotation editor mode loaded by default. |
| `magicPdf.default.externalLinkTarget` | `blank` | How external links inside the PDF are opened. |
| `magicPdf.enableScripting` | `false` | Allow execution of JavaScript embedded in PDFs. Disabled by default for security. |
| `magicPdf.enablePermissions` | `true` | Respect the PDF's permission flags (copy / modify / annotate). Disable to bypass them on your own files. |
| `magicPdf.enableHWA` | `true` | Use hardware acceleration for canvas rendering. |
| `magicPdf.maxCanvasPixels` | `33554432` | Maximum canvas pixels per page. Lower it for very large PDFs that exceed GPU limits. |
| `magicPdf.toolbarDensity` | `normal` | Toolbar density. `compact` shrinks paddings for small windows; `touch` enlarges hit targets for touch screens. |

## Keyboard Shortcuts

See **[docs/KEYBOARD_SHORTCUTS.md](docs/KEYBOARD_SHORTCUTS.md)** for the full list (navigation, zoom, find, cursor tools, rotate, sidebar, save / print, annotations).

## Known Issues

- **Same PDF in two split panels:** if you edit in both panels, only the active panel's edits are written on save. Split-screen for **reading** is unaffected.
- **AI translation** needs a Copilot language model installed and authorized; without one, translation is unavailable.
<!-- TODO: añadir nuevos known issues conforme aparezcan. -->

## Release Notes

See **[CHANGELOG.md](CHANGELOG.md)**.

## Contributing

Contributions are welcome — see **[CONTRIBUTING.md](CONTRIBUTING.md)** for setup, scripts, conventions, and how to update the bundled PDF.js prebuild.

## License

Licensed under [Apache-2.0](LICENSE).
