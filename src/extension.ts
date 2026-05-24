import * as vscode from 'vscode';
import { PdfProvider } from './pdfProvider';
import { OutlineTreeProvider } from './outlineTreeProvider';

const STATUS_BAR_PRIORITY = 100;

export function activate(context: vscode.ExtensionContext): void {
  const logger = vscode.window.createOutputChannel('Magic PDF', { log: true });
  const provider = new PdfProvider(context.extensionUri, context.workspaceState, logger);
  const outlineTree = new OutlineTreeProvider(provider.outlineStore);

  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, STATUS_BAR_PRIORITY);
  statusBar.command = 'magicPdf.goToPage';
  statusBar.tooltip = vscode.l10n.t('Go to page');

  const refreshStatusBar = (): void => {
    const active = provider.activePreview();
    if (!active) {
      statusBar.hide();
      return;
    }
    const { page, numPages, scale } = active.currentPageInfo;
    const pageStr = page ?? '?';
    const totalStr = numPages ?? '?';
    const zoomStr = typeof scale === 'number' ? ` · ${Math.round(scale * 100)}%` : '';
    statusBar.text = `$(file-pdf) ${pageStr} / ${totalStr}${zoomStr}`;
    statusBar.show();
  };

  // Bind the outline tree to whichever PDF is the active editor. Fires both
  // when previews are added/removed and when the user switches tabs.
  const syncActive = (): void => {
    const active = provider.activePreview();
    outlineTree.setActive(active?.resourceUri);
    void vscode.commands.executeCommand('setContext', 'magicPdf.hasActivePdf', active !== undefined);
    refreshStatusBar();
  };
  syncActive();

  context.subscriptions.push(
    logger,
    vscode.window.registerCustomEditorProvider('magicPdf.preview', provider, {
      webviewOptions: { retainContextWhenHidden: true },
      supportsMultipleEditorsPerDocument: true,
    }),
    provider.onDidChangeActivePreview(syncActive),
    vscode.window.onDidChangeActiveColorTheme(() => provider.notifyHostThemeChanged()),
    vscode.window.createTreeView('magicPdf.outline', {
      treeDataProvider: outlineTree,
      showCollapseAll: true,
    }),
    vscode.commands.registerCommand('magicPdf.goToOutlineEntry', (dest: unknown) => {
      provider.activePreview()?.goToDestination(dest);
    }),
    vscode.commands.registerCommand('magicPdf.goToPage', async () => {
      const active = provider.activePreview();
      if (!active) return;
      const { numPages } = active.currentPageInfo;
      const input = await vscode.window.showInputBox({
        prompt: numPages ? vscode.l10n.t('Go to page (1 – {0})', numPages) : vscode.l10n.t('Go to page'),
        placeHolder: vscode.l10n.t('Page number'),
        validateInput: (value) => {
          if (!value) return null;
          const n = Number(value);
          if (!Number.isInteger(n) || n < 1) return vscode.l10n.t('Enter a positive integer.');
          if (numPages !== undefined && n > numPages)
            return vscode.l10n.t('Page {0} exceeds document ({1} pages).', n, numPages);
          return null;
        },
      });
      if (!input) return;
      active.goToPage(Number(input));
    }),
    statusBar,
    provider.onDidChangePageInfo((preview) => {
      if (preview === provider.activePreview()) refreshStatusBar();
    }),
    outlineTree,
    provider
  );
}
