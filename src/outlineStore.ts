import * as vscode from 'vscode';
import type { OutlineNode } from './messages/protocol';

// OutlineNode is defined in the shared wire protocol; re-export so existing
// importers (`from './outlineStore'`) keep working.
export type { OutlineNode };

export class OutlineStore {
  private readonly outlines = new Map<string, OutlineNode[]>();
  private readonly emitter = new vscode.EventEmitter<vscode.Uri>();
  public readonly onDidChange = this.emitter.event;

  public set(uri: vscode.Uri, outline: OutlineNode[]): void {
    this.outlines.set(uri.toString(), outline);
    this.emitter.fire(uri);
  }

  public get(uri: vscode.Uri): OutlineNode[] | undefined {
    return this.outlines.get(uri.toString());
  }

  public clear(uri: vscode.Uri): void {
    if (this.outlines.delete(uri.toString())) this.emitter.fire(uri);
  }

  public dispose(): void {
    this.outlines.clear();
    this.emitter.dispose();
  }
}
