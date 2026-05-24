// Redirects pdfjs' download manager to the host so saves/exports go through
// VS Code's FS instead of triggering a browser download inside the webview.

import type { HostBridge } from './host';

export function interceptDownloads(app: PdfApplication, vscodeApi: HostBridge): void {
  const exportToHost = (data: Uint8Array | ArrayBuffer, filename?: string): void => {
    if (!data) return;
    const view = data instanceof Uint8Array ? data : new Uint8Array(data);
    vscodeApi.postMessage({
      type: 'exportBytes',
      filename: filename || 'document.pdf',
      bytes: view.slice(),
    });
  };
  if (app.downloadManager) {
    app.downloadManager.download = (data, _url, filename) => exportToHost(data, filename);
    app.downloadManager.downloadData = (data, filename) => exportToHost(data, filename);
    app.downloadManager.openOrDownloadData = (data, filename) => {
      exportToHost(data, filename);
      return false;
    };
  }
}
