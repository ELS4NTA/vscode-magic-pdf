// Document lifecycle: forwards load/error/outline to the host, hides empty
// sidebar view menus, and streams page/scale info for the status bar.

import type { OutlineNode } from '../messages/protocol';
import type { HostBridge } from './host';

// Maps a pdfjs outline tree to the plain shape the host's TreeView expects.
// Module-private so the recursive map stays within the nesting limit.
function serializeOutline(nodes: PdfOutlineItem[] | null | undefined): OutlineNode[] {
  return (nodes ?? []).map((node) => ({
    title: node.title,
    dest: node.dest,
    items: serializeOutline(node.items),
  }));
}

export function installDocumentEvents(app: PdfApplication, vscodeApi: HostBridge): void {
  app.eventBus.on('print', () => {
    vscodeApi.postMessage({ type: 'print' });
  });

  app.eventBus.on('printingallowed', (evt) => {
    if (evt.isAllowed !== false) return;
    for (const selector of ['#printButton', '#secondaryPrint']) {
      const element = document.querySelector<HTMLElement>(selector);
      if (element) element.hidden = true;
    }
  });

  app.eventBus.on('documentloaded', () => {
    const doc = app.pdfDocument;
    vscodeApi.postMessage({
      type: 'documentloaded',
      numPages: doc?.numPages,
      fingerprint: doc?.fingerprints?.[0] ?? null,
    });
    void doc
      ?.getOutline?.()
      .then((items) => {
        vscodeApi.postMessage({ type: 'outline', outline: serializeOutline(items) });
      })
      .catch(() => {
        // getOutline rejects on encrypted/corrupted docs; safe to swallow,
        // the TreeView just stays empty for this document.
      });
  });

  app.eventBus.on('documenterror', (evt) => {
    vscodeApi.postMessage({
      type: 'documenterror',
      message: evt.message || 'Failed to load PDF',
      reason: evt.reason || null,
    });
  });

  const hideViewMenu = (selector: string): void => {
    const element = document.querySelector<HTMLElement>(selector);
    if (element) element.hidden = true;
  };

  app.eventBus.on('outlineloaded', (evt) => {
    if (!evt.outlineCount) hideViewMenu('#outlinesViewMenu');
  });

  app.eventBus.on('attachmentsloaded', (evt) => {
    if (!evt.attachmentsCount) hideViewMenu('#attachmentsViewMenu');
  });

  app.eventBus.on('layersloaded', (evt) => {
    if (!evt.layersCount) hideViewMenu('#layersViewMenu');
  });
}

export function installPageInfo(app: PdfApplication, vscodeApi: HostBridge): void {
  app.eventBus.on('pagechanging', (evt) => {
    vscodeApi.postMessage({ type: 'pageInfo', page: evt.pageNumber });
  });

  app.eventBus.on('scalechanging', (evt) => {
    vscodeApi.postMessage({ type: 'pageInfo', scale: evt.scale });
  });

  app.eventBus.on('pagesinit', () => {
    vscodeApi.postMessage({
      type: 'pageInfo',
      page: app.pdfViewer?.currentPageNumber ?? 1,
      scale: app.pdfViewer?.currentScale,
      numPages: app.pdfDocument?.numPages ?? app.pagesCount,
    });
  });
}
