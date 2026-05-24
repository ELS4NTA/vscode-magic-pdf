// Inbound side: routes host → webview messages to the translate popup / viewer,
// and tracks the current text selection so the translate button can prefill it.

import type { OutboundMessage } from '../messages/protocol';
import type { TranslatePopup } from './translatePopup';

export interface SelectionTracker {
  getLastText(): string;
}

export function createSelectionTracker(translate: TranslatePopup): SelectionTracker {
  let lastSelectionText = '';
  document.addEventListener('selectionchange', () => {
    const selection = globalThis.getSelection();
    const selectedText = selection?.toString().trim();
    if (!selectedText) return;
    if (translate.contains(selection!.anchorNode)) return;
    lastSelectionText = selectedText;
    translate.syncSelection(selectedText);
  });
  return { getLastText: () => lastSelectionText };
}

export function installInboundRouter(app: PdfApplication, translate: TranslatePopup): void {
  globalThis.addEventListener('message', (event: MessageEvent) => {
    const message = event.data as OutboundMessage | undefined;
    if (!message) return;
    if (message.type === 'translateOpen') translate.open(message.text);
    else if (message.type === 'translateChunk') translate.append(message.requestId, message.chunk);
    else if (message.type === 'translateEnd') {
      if (message.error) translate.error(message.requestId, `Translation failed: ${message.error}`);
      else translate.finish(message.requestId);
    } else if (message.type === 'goToDestination') {
      app.pdfLinkService?.goToDestination?.(message.dest);
    } else if (message.type === 'goToPage' && typeof message.page === 'number') {
      if (app.pdfViewer) app.pdfViewer.currentPageNumber = message.page;
    }
  });
}
