// Restores the saved view (page/rotation/scroll) on load and persists view
// area + sidebar changes back to the host (debounced) as `state` messages.

import type { BootstrapConfig, ViewState } from '../messages/protocol';
import type { HostBridge } from './host';

export function restoreView(app: PdfApplication, cfg: BootstrapConfig): void {
  const view: ViewState = cfg.savedView || {};
  if (!(view.page || view.rotation)) return;
  const restore = (): void => {
    app.eventBus.off('pagesinit', restore);
    const viewer = app.pdfViewer;
    if (!viewer) return;
    try {
      if (view.rotation) {
        viewer.pagesRotation = view.rotation;
      }
      const page = view.page || 1;
      if (typeof view.top === 'number' && typeof view.left === 'number') {
        viewer.scrollPageIntoView({
          pageNumber: page,
          destArray: [null, { name: 'XYZ' }, view.left, view.top],
          ignoreDestinationZoom: true,
        });
      } else if (page > 1) {
        viewer.currentPageNumber = page;
      }
    } catch {
      /* ignore — best-effort restore */
    }
  };
  app.eventBus.on('pagesinit', restore);
}

export function installStatePersistence(app: PdfApplication, cfg: BootstrapConfig, vscodeApi: HostBridge): void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastSerialized = '';
  let lastLocation: PdfLocation | null = null;
  let lastSidebar: number | null = cfg.savedView?.sidebar ?? null;
  const persist = (): void => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      const payload: ViewState = {};
      if (lastLocation) {
        payload.page = lastLocation.pageNumber;
        payload.top = lastLocation.top;
        payload.left = lastLocation.left;
        payload.rotation = lastLocation.rotation;
        payload.scale = lastLocation.scale;
      }
      if (lastSidebar != null) payload.sidebar = lastSidebar;
      const serialized = JSON.stringify(payload);
      if (serialized === lastSerialized) return;
      lastSerialized = serialized;
      vscodeApi.postMessage({ type: 'state', payload });
    }, 500);
  };

  app.eventBus.on('updateviewarea', (evt) => {
    lastLocation = evt.location ?? null;
    persist();
  });

  app.eventBus.on('sidebarviewchanged', (evt) => {
    lastSidebar = evt.view ?? null;
    persist();
  });
}
