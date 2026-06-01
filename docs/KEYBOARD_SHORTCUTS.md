# Keyboard shortcuts

Shortcuts available inside the PDF viewer. They are handled internally by pdfjs (they do **not** go through VS Code's keybinding system), so they always work while the viewer has focus.

Convention: `Cmd` on macOS, `Ctrl` on Windows/Linux.

## Navigation

| Shortcut | Action |
|---|---|
| `↑` `↓` `←` `→` | Scroll / caret browsing |
| `PageUp` / `PageDown` | Previous / next page |
| `Space` | Next page |
| `Shift+Space` / `Backspace` | Previous page |
| `J` / `N` | Next page |
| `K` / `P` | Previous page |
| `Home` | First page |
| `End` | Last page |
| `Cmd/Ctrl+↑` | First page |
| `Cmd/Ctrl+↓` | Last page |
| `Cmd/Ctrl+Alt+G` | Focus the page-number input |

## Zoom

| Shortcut | Action |
|---|---|
| `Cmd/Ctrl++` | Zoom in |
| `Cmd/Ctrl+-` | Zoom out |
| `Cmd/Ctrl+0` | Reset zoom |

## Find

| Shortcut | Action |
|---|---|
| `Cmd/Ctrl+F` | Open find bar |
| `Cmd/Ctrl+G` | Find next |
| `Cmd/Ctrl+Shift+G` | Find previous |
| `Esc` | Close find bar |
| `Enter` (inside find input) | Find again |
| `Shift+Enter` (inside find input) | Find previous |

## Cursor tools

| Shortcut | Action |
|---|---|
| `S` | Select cursor |
| `H` | Hand cursor (pan) |

## Rotate page

| Shortcut | Action |
|---|---|
| `R` | Rotate 90° clockwise |
| `Shift+R` | Rotate 90° counter-clockwise |

## Sidebar and views

| Shortcut | Action |
|---|---|
| `F4` | Toggle sidebar |
| `Cmd/Ctrl+Alt+P` | Presentation mode |
| `Esc` | Close secondary toolbar / exit presentation mode |

> The sidebar state (none / thumbnails / outline / attachments / layers) is persisted per document.

## File

| Shortcut | Action |
|---|---|
| `Cmd/Ctrl+S` | Save (writes annotations back to the file) |
| `Cmd/Ctrl+P` | Print — intercepted by the extension and opened in the OS app via `vscode.env.openExternal` (handler in `viewer.mjs:9146`) |
| `Cmd/Ctrl+Shift+P` (Chrome) | Print (same flow as `Cmd/Ctrl+P`) |

> pdfjs's `Cmd/Ctrl+O` (open file) is disabled in this context; use the VS Code file explorer to open PDFs.

## Annotations — when an editor is active

When `pdf-preview.default.annotationEditor` is set to `freeText` / `highlight` / `ink` / `stamp` / `signature` / `comment`, pdfjs registers these shortcuts via the `AnnotationEditorUIManager` (`pdf.mjs:2665`):

| Shortcut | Action |
|---|---|
| `Cmd/Ctrl+A` | Select all annotations on the page |
| `Cmd/Ctrl+Z` | Undo |
| `Cmd/Ctrl+Y` / `Cmd/Ctrl+Shift+Z` | Redo |
| `Backspace` / `Delete` (with or without modifiers) | Delete selected annotation |
| `Enter` / `Space` | Create new annotation with the active editor |
| `Esc` | Unselect all |
| `← → ↑ ↓` | Move selected annotation (small step) |
| `Cmd/Ctrl+←/→/↑/↓` | Move selected annotation (large step) |

### While resizing an annotation

When the resize handles are active:

| Shortcut | Action |
|---|---|
| `← → ↑ ↓` | Resize (small step) |
| `Cmd/Ctrl+←/→/↑/↓` | Resize (large step) |
| `Esc` | Cancel resize |

## Color picker (highlight)

When the highlight color picker dropdown is open:

| Shortcut | Action |
|---|---|
| `← → ↑ ↓` | Move between colors |
| `Home` / `End` | First / last color |
| `Space` | Select color |
| `Esc` | Close dropdown |

## Text / selection

| Shortcut | Action |
|---|---|
| `Cmd/Ctrl+C` | Copy selected text |
| `Cmd/Ctrl+A` (outside editor mode) | Native browser selection; used by pdfjs to enable "copy all" when followed by copy |
| `Esc` (during copy all) | Cancel the copy |
