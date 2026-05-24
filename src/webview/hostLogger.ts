// Host bridge: structured error reporting + global error handlers + the print
// shortcut. These run at the entry level, before the viewer boots.

import type { HostBridge, HostLogger } from './host';

// Stringify an arbitrary thrown value for the host log. Prefers an Error's
// stack; narrows before String() so we never emit a bare '[object Object]'.
function detailText(detail: unknown): string | undefined {
  if (detail == null) return undefined;
  if (detail instanceof Error) return detail.stack ?? detail.message;
  if (typeof detail === 'string') return detail;
  if (typeof detail === 'number' || typeof detail === 'boolean' || typeof detail === 'bigint') {
    return String(detail);
  }
  if (typeof detail === 'symbol') return detail.toString();
  if (typeof detail === 'function') return detail.name || 'function';
  return JSON.stringify(detail);
}

// Short human message for an arbitrary thrown value (an Error's message, not
// its stack).
function messageText(value: unknown): string {
  if (value == null) return '';
  if (value instanceof Error) return value.message;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }
  if (typeof value === 'symbol') return value.toString();
  if (typeof value === 'function') return value.name || 'function';
  return JSON.stringify(value);
}

export function createHostLogger(vscodeApi: HostBridge): HostLogger {
  return (level, message, detail) => {
    vscodeApi.postMessage({
      type: 'logError',
      level,
      message: message || 'Unknown webview error',
      detail: detailText(detail),
    });
  };
}

export function installErrorHandlers(reportToHost: HostLogger): void {
  globalThis.addEventListener('error', (event) => {
    if (!event.error && !event.message) return;
    reportToHost('error', event.message || 'Uncaught error', event.error);
  });

  globalThis.addEventListener('unhandledrejection', (event) => {
    const reason: unknown = event.reason;
    const name = reason instanceof Error ? reason.name : '';
    const msg = messageText(reason);
    if (/cancelled|abort|transport destroyed|destroyed/i.test(`${name} ${msg}`)) return;
    reportToHost('error', msg || 'Unhandled rejection', reason);
  });
}

export function installPrintShortcut(vscodeApi: HostBridge): void {
  globalThis.addEventListener(
    'keydown',
    (event) => {
      if (event.code === 'KeyP' && (event.ctrlKey || event.metaKey) && !event.altKey) {
        event.preventDefault();
        event.stopImmediatePropagation();
        vscodeApi.postMessage({ type: 'print' });
      }
    },
    true
  );
}
