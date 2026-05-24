// Wire protocol shared by the extension host and the webview bundle.
//
// PURE TYPES ONLY — no runtime imports (no `vscode`, no node). Both tsconfigs
// (the node-targeted root one and the DOM-targeted tsconfig.webview.json)
// include this file, so dragging a host-only dependency in here would break the
// webview type-check. Keep it dependency-free.

export interface OutlineNode {
  title: string;
  dest: unknown;
  items: OutlineNode[];
}

export type ViewState = {
  page?: number;
  top?: number;
  left?: number;
  rotation?: number;
  scale?: string | number;
  sidebar?: number;
};

export interface PageInfo {
  page?: number;
  numPages?: number;
  scale?: number;
}

/** Initial config serialized into the webview HTML (`<meta data-config>`). */
export interface BootstrapConfig {
  workerUrl: string;
  polyfillsUrl: string;
  appOptions: Record<string, unknown>;
  savedView: ViewState;
  filename: string;
  themeIsDark: boolean;
  pagesInverted: boolean;
  uiLang: string;
}

/** webview → host. The single source of truth for what the webview may post. */
export type InboundMessage =
  | { type: 'requestPdf' }
  | { type: 'print' }
  | { type: 'toggleTheme'; dirty?: boolean }
  | { type: 'togglePageColors'; dirty?: boolean }
  | { type: 'outline'; outline?: OutlineNode[] }
  | { type: 'pageInfo'; page?: number; numPages?: number; scale?: number }
  | {
      type: 'translate';
      text?: string;
      source?: string;
      target?: string;
      requestId?: number;
    }
  | { type: 'state'; payload?: ViewState }
  | { type: 'dirty' }
  | { type: 'password'; password: string }
  | { type: 'logError'; level: 'error' | 'warn'; message: string; detail?: string }
  | { type: 'exportBytes'; bytes?: Uint8Array; filename?: string }
  | { type: 'documentloaded'; numPages?: number; fingerprint?: string | null }
  | { type: 'documenterror'; message?: string; reason?: string | null }
  | {
      type: 'savedBytes';
      requestId: number;
      bytes?: Uint8Array;
      error?: string;
      noChange?: boolean;
    };

export type InboundMessageType = InboundMessage['type'];

/** host → webview. What the webview's inbound listeners may receive. */
export type OutboundMessage =
  | { type: 'pdfData'; bytes: Uint8Array; password?: string | null }
  | { type: 'requestSave'; requestId: number }
  | { type: 'goToDestination'; dest: unknown }
  | { type: 'goToPage'; page: number }
  | { type: 'translateOpen'; text?: string }
  | { type: 'translateChunk'; requestId?: number; chunk?: string }
  | { type: 'translateEnd'; requestId?: number; error?: string };

export type OutboundMessageType = OutboundMessage['type'];
