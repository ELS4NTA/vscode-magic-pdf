import * as vscode from 'vscode';
import { PdfPreview } from './pdfPreview';
import { OutlineStore } from './outlineStore';

class PdfDocument implements vscode.CustomDocument {
  public constructor(public readonly uri: vscode.Uri) {}
  public dispose(): void {}
}

export class PdfProvider implements vscode.CustomEditorProvider<PdfDocument>, vscode.Disposable {
  private readonly changeEmitter = new vscode.EventEmitter<vscode.CustomDocumentContentChangeEvent<PdfDocument>>();
  public readonly onDidChangeCustomDocument = this.changeEmitter.event;
  private readonly previews = new Map<string, Set<PdfPreview>>();
  private readonly activeChangeEmitter = new vscode.EventEmitter<void>();
  public readonly onDidChangeActivePreview = this.activeChangeEmitter.event;
  private readonly pageInfoChangeEmitter = new vscode.EventEmitter<PdfPreview>();
  public readonly onDidChangePageInfo = this.pageInfoChangeEmitter.event;
  public readonly outlineStore = new OutlineStore();
  private readonly disposables: vscode.Disposable[] = [
    this.changeEmitter,
    this.activeChangeEmitter,
    this.pageInfoChangeEmitter,
    this.outlineStore,
  ];

  public constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly state: vscode.Memento,
    private readonly logger: vscode.LogOutputChannel
  ) {}

  public openCustomDocument(uri: vscode.Uri): PdfDocument {
    return new PdfDocument(uri);
  }

  public async saveCustomDocument(document: PdfDocument): Promise<void> {
    const preview = this.requirePreview(document);
    const bytes = await preview.requestSavedBytes();
    if (!bytes) return;
    preview.suppressWatcher();
    preview.markSavedBytes(bytes);
    await vscode.workspace.fs.writeFile(document.uri, bytes);
  }

  public async saveCustomDocumentAs(document: PdfDocument, target: vscode.Uri): Promise<void> {
    const preview = this.requirePreview(document);
    const bytes = (await preview.requestSavedBytes()) ?? (await vscode.workspace.fs.readFile(document.uri));
    await vscode.workspace.fs.writeFile(target, bytes);
  }

  public async revertCustomDocument(document: PdfDocument): Promise<void> {
    const set = this.previews.get(document.uri.toString());
    if (!set) return;
    for (const preview of set) preview.revert();
  }

  public async backupCustomDocument(
    document: PdfDocument,
    context: vscode.CustomDocumentBackupContext
  ): Promise<vscode.CustomDocumentBackup> {
    const preview = this.requirePreview(document);
    const bytes = (await preview.requestSavedBytes()) ?? (await vscode.workspace.fs.readFile(document.uri));
    await vscode.workspace.fs.writeFile(context.destination, bytes);
    return {
      id: context.destination.toString(),
      delete: () => {
        void vscode.workspace.fs.delete(context.destination).then(undefined, () => {});
      },
    };
  }

  public resolveCustomEditor(document: PdfDocument, panel: vscode.WebviewPanel): void {
    const preview = new PdfPreview(this.extensionUri, document.uri, panel, this.state, this.logger, this.outlineStore);
    const key = document.uri.toString();
    let set = this.previews.get(key);
    if (!set) {
      set = new Set();
      this.previews.set(key, set);
    }
    set.add(preview);
    const sub = preview.onDidChange(() => this.changeEmitter.fire({ document }));
    const activeSub = preview.onDidChangeActive(() => this.activeChangeEmitter.fire());
    const pageInfoSub = preview.onDidChangePageInfo(() => this.pageInfoChangeEmitter.fire(preview));

    this.activeChangeEmitter.fire();
    panel.onDidDispose(() => {
      sub.dispose();
      activeSub.dispose();
      pageInfoSub.dispose();
      preview.dispose();
      const current = this.previews.get(key);
      if (current) {
        current.delete(preview);
        if (current.size === 0) this.previews.delete(key);
      }
      this.activeChangeEmitter.fire();
    });
  }

  private requirePreview(document: PdfDocument): PdfPreview {
    const set = this.previews.get(document.uri.toString());
    if (!set || set.size === 0) {
      throw new Error(`No active preview for ${document.uri.fsPath}`);
    }

    for (const preview of set) {
      if (preview.isActive) return preview;
    }
    const [first] = set;
    return first;
  }

  private *allPreviews(): IterableIterator<PdfPreview> {
    for (const set of this.previews.values()) yield* set;
  }

  public notifyHostThemeChanged(): void {
    for (const preview of this.allPreviews()) preview.refreshOnHostThemeChange();
  }

  public activePreview(): PdfPreview | undefined {
    for (const preview of this.allPreviews()) {
      if (preview.isActive) return preview;
    }
    return undefined;
  }

  public dispose(): void {
    for (const d of this.disposables) d.dispose();
    this.disposables.length = 0;
  }
}
