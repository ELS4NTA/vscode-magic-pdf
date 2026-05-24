import type { InboundMessage } from '../messages/protocol';

// Typed bridge to the extension host. The VS Code `WebviewApi` returned by
// acquireVsCodeApi() is structurally assignable to this (its postMessage takes
// `unknown`), so passing it where a HostBridge is expected forces every webview
// → host message through the shared InboundMessage union: rename a field in the
// protocol and the webview stops compiling.
export interface HostBridge {
  postMessage(message: InboundMessage): void;
}

export type HostLogger = (
  level: 'error' | 'warn',
  message: string,
  detail?: unknown
) => void;
