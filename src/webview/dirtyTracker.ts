// Tracks unsaved edits (annotation storage hash + structural page changes +
// merge-pending) and notifies the host with `dirty` messages. Owns its own
// baseline state; the save controller queries it via the returned methods.

import type { HostBridge } from './host';

export interface DirtyTracker {
  hasUnsavedEdits(): boolean;
  markSaved(): void;
  isMergePending(): boolean;
  clearMergePending(): void;
}

export function createDirtyTracker(app: PdfApplication, vscodeApi: HostBridge): DirtyTracker {
  let savedBaselineHash = '';
  let baselineHash = '';
  let mergePending = false;

  const annotationHash = (): string => {
    try {
      return app.pdfDocument?.annotationStorage?.serializable?.hash || '';
    } catch {
      return '';
    }
  };
  const currentHash = (storage: PdfAnnotationStorage): string => {
    try {
      return storage.serializable?.hash || '';
    } catch {
      return '';
    }
  };

  app.eventBus.on('pagesloaded', () => {
    const storage = app.pdfDocument?.annotationStorage;
    if (!storage) return;
    baselineHash = currentHash(storage);
    savedBaselineHash = baselineHash;
  });

  app.eventBus.on('saveandload', () => {
    mergePending = true;
    vscodeApi.postMessage({ type: 'dirty' });
  });

  const checkDirty = (): void => {
    const storage = app.pdfDocument?.annotationStorage;
    if (!storage) return;
    const hash = currentHash(storage);
    if (hash !== baselineHash) {
      baselineHash = hash;
      vscodeApi.postMessage({ type: 'dirty' });
    }
  };
  app.eventBus.on('editingstateschanged', checkDirty);

  app.eventBus.on('annotationeditormodechanged', () => {
    const storage = app.pdfDocument?.annotationStorage;
    if (!storage) return;
    baselineHash = currentHash(storage);
  });

  app.eventBus.on('pagesedited', () => {
    if (app.pdfThumbnailViewer?.hasStructuralChanges?.()) {
      vscodeApi.postMessage({ type: 'dirty' });
    }
  });

  return {
    hasUnsavedEdits: () =>
      annotationHash() !== savedBaselineHash || !!app.pdfThumbnailViewer?.hasStructuralChanges?.() || mergePending,
    markSaved: () => {
      savedBaselineHash = annotationHash();
    },
    isMergePending: () => mergePending,
    clearMergePending: () => {
      mergePending = false;
    },
  };
}
