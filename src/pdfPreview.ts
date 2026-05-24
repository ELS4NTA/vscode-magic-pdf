import * as crypto from 'node:crypto';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { PdfFileWatcher } from './pdfFileWatcher';
import { SaveRequestQueue } from './saveRequestQueue';
import { renderWebviewHtml } from './pdfWebviewHtml';
import { getPdfConfig, resolveEffectiveTheme, resolveTheme } from './pdfOptions';
import { PreferenceStore } from './preferenceStore';
import { TranslationService } from './translationService';
import type { OutlineStore } from './outlineStore';
import { routeMessage } from './messages/router';
import type { HandlerContext } from './messages/context';
import type { PageInfo, ViewState } from './messages/types';

export type { PageInfo } from './messages/types';

export class PdfPreview implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];
  private readonly stateKey: string;
  private readonly onDidChangeEmitter = new vscode.EventEmitter<void>();
  public readonly onDidChange = this.onDidChangeEmitter.event;
  private readonly onDidChangeActiveEmitter = new vscode.EventEmitter<void>();
  public readonly onDidChangeActive = this.onDidChangeActiveEmitter.event;
  private readonly onDidChangePageInfoEmitter = new vscode.EventEmitter<void>();
  public readonly onDidChangePageInfo = this.onDidChangePageInfoEmitter.event;
  private pageInfo: PageInfo = {};
  private lastRenderedEffectiveTheme: 'light' | 'dark' | undefined;
  private lastSentSignature: string | undefined;
  private sessionPassword: string | undefined;
  private readonly watcher: PdfFileWatcher;
  private readonly saveQueue: SaveRequestQueue;
  private readonly extensionRoot: vscode.Uri;
  private readonly prefs: PreferenceStore;
  private readonly translator: TranslationService;
  private readonly outlineStore: OutlineStore;
  private readonly context: HandlerContext;

  public get isActive(): boolean {
    return this.webviewEditor.active;
  }

  public get resourceUri(): vscode.Uri {
    return this.resource;
  }

  public get currentPageInfo(): PageInfo {
    return this.pageInfo;
  }

  public constructor(
    extensionRoot: vscode.Uri,
    private readonly resource: vscode.Uri,
    private readonly webviewEditor: vscode.WebviewPanel,
    private readonly state: vscode.Memento,
    private readonly logger: vscode.LogOutputChannel,
    outlineStore: OutlineStore
  ) {
    this.stateKey = `magicPdf:view:${resource.toString()}`;
    this.extensionRoot = extensionRoot;
    this.prefs = new PreferenceStore(state);
    this.translator = new TranslationService(logger);
    this.outlineStore = outlineStore;

    const resourceRoot = resource.with({
      path: resource.path.replace(/\/[^/]+?\.\w+$/, '/'),
    });
    webviewEditor.webview.options = {
      enableScripts: true,
      localResourceRoots: [resourceRoot, extensionRoot],
    };

    this.saveQueue = new SaveRequestQueue((requestId) => {
      void this.webviewEditor.webview.postMessage({ type: 'requestSave', requestId });
    });

    this.watcher = new PdfFileWatcher(
      resource,
      () => {
        void this.reloadIfContentChanged();
      },
      () => {
        this.logger.info('File deleted, closing preview', resource.fsPath);
        webviewEditor.dispose();
      }
    );

    this.context = this.buildContext();

    this.disposables.push(
      this.onDidChangeEmitter,
      this.onDidChangeActiveEmitter,
      this.onDidChangePageInfoEmitter,
      this.watcher,
      webviewEditor.webview.onDidReceiveMessage((m: unknown) => routeMessage(m, this.context)),
      webviewEditor.onDidChangeViewState(() => this.onDidChangeActiveEmitter.fire())
    );

    this.renderHtml();
  }

  /**
   * Builds the HandlerContext object that will be passed to message handlers.
   * @returns The constructed HandlerContext object for this preview instance.
   */
  private buildContext(): HandlerContext {
    return {
      resource: this.resource,
      webview: this.webviewEditor.webview,
      logger: this.logger,
      state: this.state,
      stateKey: this.stateKey,
      prefs: this.prefs,
      translator: this.translator,
      outlineStore: this.outlineStore,
      saveQueue: this.saveQueue,
      sendBytesFromDisk: () => void this.sendBytesFromDisk(),
      renderHtml: () => this.renderHtml(),
      exportBytes: (bytes, filename) => this.exportToFile(bytes, filename),
      updatePageInfo: (patch) => this.applyPageInfoPatch(patch),
      markDirty: () => this.onDidChangeEmitter.fire(),
      setSessionPassword: (password) => {
        this.sessionPassword = password;
      },
    };
  }

  private applyPageInfoPatch(patch: Partial<PageInfo>): void {
    const keys: readonly (keyof PageInfo)[] = ['page', 'numPages', 'scale'];
    let changed = false;
    for (const key of keys) {
      const value = patch[key];
      if (value !== undefined && value !== this.pageInfo[key]) {
        this.pageInfo[key] = value;
        changed = true;
      }
    }
    if (changed) this.onDidChangePageInfoEmitter.fire();
  }

  private renderHtml(): void {
    const saved = this.state.get<ViewState>(this.stateKey) ?? {};
    this.webviewEditor.webview.html = renderWebviewHtml({
      extensionRoot: this.extensionRoot,
      webview: this.webviewEditor.webview,
      savedView: saved,
      themeOverride: this.prefs.themeOverride(),
      pageColorsOverride: this.prefs.pageColorsOverride(),
      filename: path.basename(this.resource.fsPath),
    });
    this.lastRenderedEffectiveTheme = resolveEffectiveTheme(this.prefs.themeOverride(), getPdfConfig());
  }

  /**
   * Refreshes the PDF preview when the host VS Code theme changes, but only
   * if the effective theme is set to 'auto' and the resolved theme has actually
   * changed since the last render.
   */
  public refreshOnHostThemeChange(): void {
    const config = getPdfConfig();
    if (resolveTheme(this.prefs.themeOverride(), config) !== 'auto') return;
    const effective = resolveEffectiveTheme(this.prefs.themeOverride(), config);
    if (effective === this.lastRenderedEffectiveTheme) return;
    this.renderHtml();
  }

  /**
   * Forward an outline-driven navigation from the TreeView to pdfjs. The
   * dest is whatever pdfjs gave us in getOutline() — pdfLinkService accepts
   * both named (string) and explicit ([pageRef, "XYZ", x, y, zoom]) forms.
   * @param dest The pdfjs outline destination to navigate to.
   */
  public goToDestination(dest: unknown): void {
    void this.webviewEditor.webview.postMessage({ type: 'goToDestination', dest });
    this.webviewEditor.reveal(undefined, false);
  }

  public goToPage(page: number): void {
    void this.webviewEditor.webview.postMessage({ type: 'goToPage', page });
    this.webviewEditor.reveal(undefined, false);
  }

  public dispose(): void {
    this.logger.info('Closed', this.resource.fsPath);
    this.outlineStore.clear(this.resource);
    this.saveQueue.dispose();
    this.translator.dispose();
    while (this.disposables.length) this.disposables.pop()?.dispose();
  }

  /**
   * Revert to the last saved state by re-sending the current on-disk bytes to pdfjs.
   * Used by external watcher
   */
  public revert(): void {
    void this.sendBytesFromDisk();
  }

  /**
   * Request the saved bytes of the PDF document.
   * @returns A promise resolving to the saved bytes or null if no changes are pending.
   */
  public requestSavedBytes(): Promise<Uint8Array | null> {
    return this.saveQueue.request();
  }

  /**
   * Suppress the disk watcher for a specified amount of time.
   * @param ms The time in milliseconds to suppress the watcher.
   */
  public suppressWatcher(ms = 1000): void {
    this.watcher.suppress(ms);
  }

  /**
   * Mark the given bytes as saved, updating the content signature.
   * @param bytes The bytes to mark as saved.
   */
  public markSavedBytes(bytes: Uint8Array): void {
    this.lastSentSignature = crypto.createHash('sha1').update(bytes).digest('hex');
  }

  /**
   * Export the given bytes to a user-selected location using the VS Code file picker.
   * @param bytes The PDF bytes to export.
   * @param filename An optional suggested filename for the exported PDF.
   *     If not provided, a default name based on the original PDF will be used.
   * @returns A promise that resolves when the export operation is complete,
   *     or rejects if an error occurs during export.
   */
  private async exportToFile(bytes: Uint8Array, filename: string | undefined): Promise<void> {
    const suggested =
      filename && filename.length > 0 ? filename : `${path.basename(this.resource.fsPath, '.pdf')}-export.pdf`;
    const defaultUri = vscode.Uri.joinPath(vscode.Uri.file(path.dirname(this.resource.fsPath)), suggested);
    const target = await vscode.window.showSaveDialog({
      defaultUri,
      filters: { PDF: ['pdf'] },
    });

    if (!target) return;

    try {
      await vscode.workspace.fs.writeFile(target, bytes);
      this.logger.info('Exported', target.fsPath);
    } catch (err) {
      this.logger.error('Export failed', target.fsPath, err);
      void vscode.window.showErrorMessage(vscode.l10n.t('Failed to export PDF: {0}', String(err)));
    }
  }

  /**
   * Read the PDF bytes from disk and send them to the webview. Also updates the
   * last sent content signature for change detection. Used for the initial load and
   * when reverting to the last saved state. If reading fails, logs an error.
   */
  private async sendBytesFromDisk(): Promise<void> {
    try {
      const bytes = await vscode.workspace.fs.readFile(this.resource);
      this.lastSentSignature = crypto.createHash('sha1').update(bytes).digest('hex');
      this.postPdfData(bytes);
    } catch (err) {
      this.logger.error('Failed to read PDF bytes', this.resource.fsPath, err);
    }
  }

  /**
   * Reloads the PDF if its content has changed.
   * @returns A promise that resolves when the check and potential reload are complete.
   */
  private async reloadIfContentChanged(): Promise<void> {
    let bytes: Uint8Array;

    try {
      bytes = await vscode.workspace.fs.readFile(this.resource);
    } catch (err) {
      this.logger.error('Failed to read PDF bytes', this.resource.fsPath, err);
      return;
    }

    const signature = crypto.createHash('sha1').update(bytes).digest('hex');
    if (signature === this.lastSentSignature) {
      this.logger.debug('File touched but content unchanged, skipping reload', this.resource.fsPath);
      return;
    }

    this.logger.info('File content changed, reloading', this.resource.fsPath);
    this.lastSentSignature = signature;
    this.postPdfData(bytes);
  }

  /**
   * Single point that pushes bytes into the webview. Re-supplies the session
   * password (if any) so encrypted PDFs reopen without re-prompting.
   * @param bytes The PDF file content to load into the webview.
   */
  private postPdfData(bytes: Uint8Array): void {
    void this.webviewEditor.webview.postMessage({
      type: 'pdfData',
      bytes: new Uint8Array(bytes),
      password: this.sessionPassword,
    });
  }
}
