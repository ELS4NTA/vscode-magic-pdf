// Injects the custom toolbar UI: history (prev/next view) buttons plus the
// theme / page-colors / translate toggles in both the primary toolbar (icons)
// and the secondary overflow menu (labeled).

import type { BootstrapConfig } from '../messages/protocol';
import type { HostBridge } from './host';
import type { DirtyTracker } from './dirtyTracker';
import type { TranslatePopup } from './translatePopup';
import type { SelectionTracker } from './inboundRouter';

export function installHistoryButtons(app: PdfApplication): void {
  const prevBtn = document.getElementById('previous');
  if (!prevBtn?.parentElement) return;
  const group = document.createElement('div');
  group.className = 'toolbarHorizontalGroup';
  group.innerHTML =
    '<button id="historyBack" class="toolbarButton" type="button" title="Previous view" tabindex="0"><span class="visuallyHidden">Previous view</span></button>' +
    '<div class="splitToolbarButtonSeparator"></div>' +
    '<button id="historyForward" class="toolbarButton" type="button" title="Next view" tabindex="0"><span class="visuallyHidden">Next view</span></button>';
  prevBtn.parentElement.parentElement!.insertBefore(group, prevBtn.parentElement);
  document.getElementById('historyBack')!.addEventListener('click', () => app.pdfHistory?.back());
  document.getElementById('historyForward')!.addEventListener('click', () => app.pdfHistory?.forward());
}

interface ToolbarButtonOptions {
  id: string;
  className: string;
  title?: string;
  hiddenLabel?: string;
  label?: string;
  onClick: (event: MouseEvent) => void;
  onMouseDown?: (event: MouseEvent) => void;
}

// Builds a toolbar <button>. Icon buttons pass `hiddenLabel` (visually-hidden
// span); labeled buttons pass `label` (visible text). Shared by the primary
// toolbar (icons) and the secondary overflow menu (labeled).
function makeToolbarButton(opts: ToolbarButtonOptions): HTMLButtonElement {
  const { id, className, title, hiddenLabel, label, onClick, onMouseDown } = opts;
  const btn = document.createElement('button');
  btn.id = id;
  btn.className = className;
  btn.type = 'button';
  btn.tabIndex = 0;
  if (title) btn.title = title;
  const span = document.createElement('span');
  if (hiddenLabel) span.className = 'visuallyHidden';
  span.textContent = hiddenLabel || label || '';
  btn.append(span);
  if (onMouseDown) btn.addEventListener('mousedown', onMouseDown);
  btn.addEventListener('click', onClick);
  return btn;
}

interface ToolbarDeps {
  dirty: DirtyTracker;
  translate: TranslatePopup;
  selection: SelectionTracker;
}

export function installToolbarButtons(
  app: PdfApplication,
  cfg: BootstrapConfig,
  vscodeApi: HostBridge,
  { dirty, translate, selection }: ToolbarDeps
): void {
  const themeTitle = cfg.themeIsDark ? 'Switch to light theme' : 'Switch to dark theme';
  const pagesTitle = cfg.pagesInverted ? 'Restore page colors' : 'Invert page colors';
  const postToggle = (type: 'toggleTheme' | 'togglePageColors'): void => {
    vscodeApi.postMessage({ type, dirty: dirty.hasUnsavedEdits() });
  };
  const openTranslate = (live?: string): void => translate.open(live || selection.getLastText());

  const printBtn = document.getElementById('printButton');
  if (printBtn?.parentElement) {
    const before = (btn: HTMLButtonElement): void => {
      printBtn.parentElement!.insertBefore(btn, printBtn);
    };
    before(
      makeToolbarButton({
        id: 'themeToggle',
        className: 'toolbarButton',
        title: themeTitle,
        hiddenLabel: 'Toggle theme',
        onClick: () => postToggle('toggleTheme'),
      })
    );
    before(
      makeToolbarButton({
        id: 'pageColorsToggle',
        className: 'toolbarButton',
        title: pagesTitle,
        hiddenLabel: 'Toggle page colors',
        onClick: () => postToggle('togglePageColors'),
      })
    );
    before(
      makeToolbarButton({
        id: 'translateToggle',
        className: 'toolbarButton',
        title: 'Translate selection',
        hiddenLabel: 'Translate selection',
        onMouseDown: (event) => {
          event.preventDefault();
        },
        onClick: () => openTranslate(globalThis.getSelection()?.toString().trim()),
      })
    );
  }

  const secDownload = document.getElementById('secondaryDownload');
  if (secDownload?.parentElement) {
    const secGroup = document.createElement('div');
    secGroup.className = 'visibleMediumView';
    const secBtn = (id: string, label: string, action: () => void): HTMLButtonElement =>
      makeToolbarButton({
        id,
        className: 'toolbarButton labeled',
        label,
        onClick: () => {
          app.secondaryToolbar?.close();
          action();
        },
      });
    secGroup.append(
      secBtn('secondaryThemeToggle', themeTitle, () => postToggle('toggleTheme')),
      secBtn('secondaryPageColorsToggle', pagesTitle, () => postToggle('togglePageColors')),
      secBtn('secondaryTranslateToggle', 'Translate selection', () => openTranslate())
    );
    secDownload.parentElement.after(secGroup);
  }
}
