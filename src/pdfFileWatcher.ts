import * as path from 'node:path';
import * as vscode from 'vscode';

/**
 * Collapses a burst of writes (typical when a builder regenerates the PDF)
 * into a single reload. 300ms is small enough that the reload still feels
 * instant after the build settles.
 */
const RELOAD_DEBOUNCE_MS = 300;

/**
 * Default suppression window around our own writeFile. Long enough for the
 * FS event to fire and be skipped; short enough that a real external write
 * arriving right after still triggers a reload.
 */
const DEFAULT_SUPPRESS_MS = 1000;

/**
 * Watches a single PDF on disk and notifies the preview when it changes or is
 * deleted.
 */
export class PdfFileWatcher implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];
  private reloadTimer: NodeJS.Timeout | undefined;
  private suppressUntil = 0;

  public constructor(resource: vscode.Uri, onReload: () => void, onDelete: () => void) {
    const watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(vscode.Uri.file(path.dirname(resource.fsPath)), path.basename(resource.fsPath))
    );
    this.disposables.push(
      watcher,
      watcher.onDidChange(() => {
        if (Date.now() < this.suppressUntil) return;
        if (this.reloadTimer) clearTimeout(this.reloadTimer);
        this.reloadTimer = setTimeout(() => {
          this.reloadTimer = undefined;
          onReload();
        }, RELOAD_DEBOUNCE_MS);
      }),
      watcher.onDidDelete(onDelete)
    );
  }

  public suppress(ms: number = DEFAULT_SUPPRESS_MS): void {
    this.suppressUntil = Date.now() + ms;
  }

  public dispose(): void {
    if (this.reloadTimer) clearTimeout(this.reloadTimer);
    while (this.disposables.length) this.disposables.pop()?.dispose();
  }
}
