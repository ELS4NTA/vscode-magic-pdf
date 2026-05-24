import * as vscode from 'vscode';
import type { OutlineNode, OutlineStore } from './outlineStore';

/**
 * Backs the "PDF Outline" TreeView in the Explorer. Shows the outline of the
 * currently active PDF (tracked by PdfProvider). Re-renders when (a) the
 * active PDF changes or (b) outline data for the active PDF changes.
 */
export class OutlineTreeProvider implements vscode.TreeDataProvider<OutlineNode>, vscode.Disposable {
  private readonly emitter = new vscode.EventEmitter<OutlineNode | undefined>();
  public readonly onDidChangeTreeData = this.emitter.event;

  private activeUri: vscode.Uri | undefined;
  private readonly subscription: vscode.Disposable;

  public constructor(private readonly store: OutlineStore) {
    this.subscription = store.onDidChange((uri) => {
      if (uri.toString() === this.activeUri?.toString()) {
        this.emitter.fire(undefined);
      }
    });
  }

  public setActive(uri: vscode.Uri | undefined): void {
    if (this.activeUri?.toString() === uri?.toString()) return;
    this.activeUri = uri;
    this.emitter.fire(undefined);
  }

  public getChildren(node?: OutlineNode): OutlineNode[] {
    if (!this.activeUri) return [];
    if (!node) return this.store.get(this.activeUri) ?? [];
    return node.items;
  }

  public getTreeItem(node: OutlineNode): vscode.TreeItem {
    const label = node.title.length > 0 ? node.title : '(untitled)';
    const collapsible =
      node.items.length > 0 ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None;
    const item = new vscode.TreeItem(label, collapsible);

    item.tooltip = label;
    item.iconPath = new vscode.ThemeIcon('symbol-string');

    if (node.dest != null) {
      item.command = {
        command: 'magicPdf.goToOutlineEntry',
        title: vscode.l10n.t('Go to section'),
        arguments: [node.dest],
      };
    }
    return item;
  }

  public dispose(): void {
    this.subscription.dispose();
    this.emitter.dispose();
  }
}
