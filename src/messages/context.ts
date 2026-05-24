import * as vscode from 'vscode';
import type { PreferenceStore } from '../preferenceStore';
import type { TranslationService } from '../translationService';
import type { OutlineStore } from '../outlineStore';
import type { SaveRequestQueue } from '../saveRequestQueue';
import type { PageInfo } from './types';

/**
 * Facade that PdfPreview hands to the router on every incoming message.
 * Handlers depend only on this interface — they never see PdfPreview itself,
 * which keeps the boundary clean and lets us unit-test handlers with a stub.
 */
export interface HandlerContext {
  readonly resource: vscode.Uri;
  readonly webview: vscode.Webview;
  readonly logger: vscode.LogOutputChannel;
  readonly state: vscode.Memento;
  readonly stateKey: string;
  readonly prefs: PreferenceStore;
  readonly translator: TranslationService;
  readonly outlineStore: OutlineStore;
  readonly saveQueue: SaveRequestQueue;

  // Operations owned by PdfPreview that handlers delegate back to it.
  sendBytesFromDisk(): void;
  renderHtml(): void;
  exportBytes(bytes: Uint8Array, filename: string | undefined): Promise<void>;

  // Mutations on PdfPreview-owned state.
  updatePageInfo(patch: Partial<PageInfo>): void;
  markDirty(): void;

  /**
   * Remember the password the user typed for an encrypted PDF, so reloads
   * (theme/page-colors toggle) can re-supply it instead of re-prompting. Held
   * only in memory for the lifetime of the preview.
   *
   * @param password The password of the PDF to store for the session.
   */
  setSessionPassword(password: string): void;
}
