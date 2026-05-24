// Viewer config parsing, option application, and PDF worker setup.

import type { BootstrapConfig } from '../messages/protocol';
import type { HostLogger } from './host';

export function parseConfig(): BootstrapConfig {
  const configElement = document.getElementById('magic-pdf-config');
  return JSON.parse(configElement!.dataset.config!) as BootstrapConfig;
}

export function applyConfig(opts: PdfApplicationOptions, cfg: BootstrapConfig): void {
  for (const key of Object.keys(cfg.appOptions)) {
    opts.set(key, cfg.appOptions[key]);
  }

  if (cfg.themeIsDark) {
    document.body.classList.add('pdf-theme-dark');
  }

  if (cfg.pagesInverted) {
    document.body.classList.add('pdf-pages-inverted');
  }

  if (cfg.savedView?.scale != null) {
    opts.set('defaultZoomValue', String(cfg.savedView.scale));
  }

  if (cfg.savedView?.sidebar != null) {
    opts.set('sidebarViewOnLoad', cfg.savedView.sidebar);
  }
}

export async function setupWorker(
  opts: PdfApplicationOptions,
  cfg: BootstrapConfig,
  reportToHost: HostLogger
): Promise<void> {
  try {
    const [polyfills, code] = await Promise.all([
      fetch(cfg.polyfillsUrl).then((response) => response.text()),
      fetch(cfg.workerUrl).then((response) => response.text()),
    ]);
    const blob = new Blob([polyfills, '\n', code], { type: 'application/javascript' });
    const blobUrl = URL.createObjectURL(blob);
    const worker = new Worker(blobUrl, { type: 'module' });
    URL.revokeObjectURL(blobUrl);
    opts.set('workerPort', worker);
  } catch (error) {
    console.warn('pdf worker blob setup failed, will use fake worker', error);
    reportToHost('warn', 'PDF worker setup failed, falling back to slower main-thread worker', error);
  }
}
