// Save / backup controller. pdfjs lives in the webview, so the host asks for
// bytes (pdfData / requestSave) and this serializes the document, handling
// annotation saves, structural page merges, and password sessions.

import type { BootstrapConfig, OutboundMessage } from '../messages/protocol';
import type { HostBridge, HostLogger } from './host';
import type { DirtyTracker } from './dirtyTracker';

function openAndWaitSettled(
  app: PdfApplication,
  openArgs: (bytes: Uint8Array) => PdfOpenArgs,
  bytes: Uint8Array,
  reportToHost: HostLogger
): Promise<void> {
  return new Promise((resolve) => {
    const settle = (): void => {
      app.eventBus.off('documentloaded', settle);
      app.eventBus.off('documenterror', settle);
      resolve();
    };
    app.eventBus.on('documentloaded', settle);
    app.eventBus.on('documenterror', settle);
    app.open(openArgs(bytes)).catch((err: unknown) => {
      console.error('PDF open failed', err);
      reportToHost('error', 'Failed to open PDF', err);
      settle();
    });
  });
}

export function createSaveController(
  app: PdfApplication,
  cfg: BootstrapConfig,
  dirty: DirtyTracker,
  vscodeApi: HostBridge,
  reportToHost: HostLogger
): void {
  let sessionPassword: string | null = null;
  let typedPassword: string | null = null;
  let openInFlight = false;
  let pendingBytes: Uint8Array | null = null;

  const openArgs = (bytes: Uint8Array): PdfOpenArgs => ({
    data: bytes,
    url: cfg.filename,
    useWorkerFetch: false,
    ...(sessionPassword ? { password: sessionPassword } : {}),
  });

  document.getElementById('password')?.addEventListener('input', (event) => {
    typedPassword = (event.target as HTMLInputElement).value;
  });

  app.eventBus.on('documentloaded', () => {
    if (typedPassword) {
      const password = typedPassword;
      sessionPassword = password;
      typedPassword = null;
      vscodeApi.postMessage({ type: 'password', password });
    }
  });

  const pumpOpen = async (): Promise<void> => {
    if (openInFlight) return;
    openInFlight = true;

    while (pendingBytes !== null) {
      const bytes = pendingBytes;
      pendingBytes = null;
      await openAndWaitSettled(app, openArgs, bytes, reportToHost);
    }
    openInFlight = false;
  };

  const onMessage = async (event: MessageEvent): Promise<void> => {
    const message = event.data as OutboundMessage | undefined;
    if (message?.type === 'pdfData') {
      if (message.password) sessionPassword = message.password;
      pendingBytes = message.bytes;
      void pumpOpen();
    } else if (message?.type === 'requestSave') {
      const { requestId } = message;
      try {
        const doc = app.pdfDocument!;
        const storage = doc.annotationStorage;
        const structural = app.pdfThumbnailViewer?.hasStructuralChanges?.();

        if (structural) {
          const params = app.pdfThumbnailViewer!.getStructuralChanges();
          const bytes = await doc.extractPages(params);
          const forHost = bytes.slice();
          dirty.clearMergePending();
          delete app._mergedDocumentNeedsSaving;
          await app.open({ ...openArgs(bytes), filename: app._docFilename });
          vscodeApi.postMessage({ type: 'savedBytes', requestId, bytes: forHost });
        } else if (storage?.size && storage.size > 0) {
          const bytes = await doc.saveDocument();
          dirty.clearMergePending();
          delete app._mergedDocumentNeedsSaving;
          vscodeApi.postMessage({ type: 'savedBytes', requestId, bytes });
        } else if (dirty.isMergePending()) {
          const bytes = await doc.getData();
          dirty.clearMergePending();
          delete app._mergedDocumentNeedsSaving;
          vscodeApi.postMessage({ type: 'savedBytes', requestId, bytes });
        } else {
          const bytes = await doc.getData();
          vscodeApi.postMessage({ type: 'savedBytes', requestId, bytes });
        }

        dirty.markSaved();
      } catch (err) {
        vscodeApi.postMessage({ type: 'savedBytes', requestId, error: String(err) });
      }
    }
  };

  globalThis.addEventListener('message', (event) => void onMessage(event));
  vscodeApi.postMessage({ type: 'requestPdf' });
}
