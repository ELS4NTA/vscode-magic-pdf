// Webview entry point. Bundled by esbuild (iife, browser) into dist/webview.js
// and loaded by a single <script nonce> from pdfWebviewHtml.ts. No globals are
// leaked: every module exports plain functions wired together here.

import { parseConfig, applyConfig, setupWorker } from './config';
import { createHostLogger, installErrorHandlers, installPrintShortcut } from './hostLogger';
import { interceptDownloads } from './downloads';
import { createDirtyTracker } from './dirtyTracker';
import { createTranslatePopup } from './translatePopup';
import { createSelectionTracker, installInboundRouter } from './inboundRouter';
import { installToolbarButtons, installHistoryButtons } from './toolbar';
import { createSaveController } from './saveController';
import { installDocumentEvents, installPageInfo } from './documentEvents';
import { restoreView, installStatePersistence } from './viewerState';
import type { BootstrapConfig } from '../messages/protocol';
import type { HostBridge, HostLogger } from './host';

const vscodeApi: HostBridge = acquireVsCodeApi();
const cfg = parseConfig();
const reportToHost = createHostLogger(vscodeApi);

installErrorHandlers(reportToHost);
installPrintShortcut(vscodeApi);

document.addEventListener('webviewerloaded', () => {
  void bootViewer(vscodeApi, cfg, reportToHost);
});

async function bootViewer(vscodeApi: HostBridge, cfg: BootstrapConfig, reportToHost: HostLogger): Promise<void> {
  const opts = PDFViewerApplicationOptions;
  const app = PDFViewerApplication;

  applyConfig(opts, cfg);
  await setupWorker(opts, cfg, reportToHost);
  await app.initializedPromise;

  interceptDownloads(app, vscodeApi);

  const dirty = createDirtyTracker(app, vscodeApi);
  const translate = createTranslatePopup(cfg, vscodeApi);
  const selection = createSelectionTracker(translate);

  installToolbarButtons(app, cfg, vscodeApi, { dirty, translate, selection });
  installHistoryButtons(app);
  installInboundRouter(app, translate);
  installDocumentEvents(app, vscodeApi);
  installPageInfo(app, vscodeApi);
  restoreView(app, cfg);
  installStatePersistence(app, cfg, vscodeApi);

  // Last: installs the pdfData/requestSave listener and asks the host for
  // bytes. Kept last so every eventBus handler above is registered before
  // the (async) pdfData reply can be processed.
  createSaveController(app, cfg, dirty, vscodeApi, reportToHost);
}
