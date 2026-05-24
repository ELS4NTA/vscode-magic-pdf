// Self-contained translate popup: builds the dialog lazily, manages source/
// target language state, posts `translate` requests to the host, and renders
// streamed chunks. Returns a small API (open/append/finish/error/...).

import type { BootstrapConfig } from '../messages/protocol';
import type { HostBridge } from './host';

export interface TranslatePopup {
  contains(node: Node | null): boolean;
  syncSelection(text: string): void;
  open(text?: string): void;
  append(requestId: number | undefined, chunk: string | undefined): void;
  finish(requestId: number | undefined): void;
  error(requestId: number | undefined, msg: string): void;
}

export function createTranslatePopup(cfg: BootstrapConfig, vscodeApi: HostBridge): TranslatePopup {
  const LANGS: [string, string][] = [
    ['en', 'English'],
    ['es', 'Spanish'],
    ['fr', 'French'],
    ['de', 'German'],
    ['it', 'Italian'],
    ['pt', 'Portuguese'],
    ['nl', 'Dutch'],
    ['ru', 'Russian'],
    ['pl', 'Polish'],
    ['tr', 'Turkish'],
    ['ar', 'Arabic'],
    ['zh', 'Chinese'],
    ['ja', 'Japanese'],
    ['ko', 'Korean'],
    ['hi', 'Hindi'],
    ['sv', 'Swedish'],
    ['da', 'Danish'],
    ['no', 'Norwegian'],
    ['fi', 'Finnish'],
    ['cs', 'Czech'],
    ['el', 'Greek'],
    ['he', 'Hebrew'],
    ['vi', 'Vietnamese'],
    ['th', 'Thai'],
    ['id', 'Indonesian'],
    ['uk', 'Ukrainian'],
    ['ro', 'Romanian'],
    ['hu', 'Hungarian'],
    ['bg', 'Bulgarian'],
    ['ca', 'Catalan'],
  ];
  const SWAP_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M7 4l-4 4 4 4"/><path d="M3 8h14"/>' +
    '<path d="M17 20l4-4-4-4"/><path d="M21 16H7"/></svg>';
  const COPY_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<rect x="9" y="9" width="13" height="13" rx="2"/>' +
    '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';

  let root: HTMLDivElement | undefined;
  let srcSel!: HTMLSelectElement;
  let tgtSel!: HTMLSelectElement;
  let sourceInput!: HTMLTextAreaElement;
  let resultText!: HTMLDivElement;
  let resultSection!: HTMLDivElement;
  let currentText = '';
  let currentSrc = 'auto';
  let currentTgt = cfg.uiLang || 'en';
  let requestSeq = 0;
  let lastFocus: HTMLElement | null = null;

  const langOptions = (includeAuto: boolean): string => {
    let html = includeAuto ? '<option value="auto">Detect</option>' : '';
    for (const [code, name] of LANGS) html += `<option value="${code}">${name}</option>`;
    return html;
  };

  const request = (): void => {
    currentText = sourceInput.value.trim();
    if (!currentText) return;
    requestSeq += 1;
    resultText.textContent = '';
    resultSection.classList.remove('error');
    root!.classList.add('loading');
    vscodeApi.postMessage({
      type: 'translate',
      requestId: requestSeq,
      text: currentText,
      source: currentSrc,
      target: currentTgt,
    });
  };

  const close = (): void => {
    if (!root) return;
    root.hidden = true;
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    lastFocus = null;
  };

  const ensure = (): void => {
    if (root) return;
    root = document.createElement('div');
    root.id = 'translatePopup';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-label', 'Translate');
    root.hidden = true;
    root.innerHTML =
      '<div class="translatePopup-header">' +
      '<span class="translatePopup-title">Translate</span>' +
      '<button class="translatePopup-close" type="button" aria-label="Close">×</button>' +
      '</div>' +
      '<div class="translatePopup-langs">' +
      `<select class="translatePopup-srcLang" aria-label="Source language">${langOptions(true)}</select>` +
      `<button class="translatePopup-swap" type="button" title="Swap languages" aria-label="Swap languages">${SWAP_SVG}</button>` +
      `<select class="translatePopup-tgtLang" aria-label="Target language">${langOptions(false)}</select>` +
      '</div>' +
      '<div class="translatePopup-runRow">' +
      '<button class="translatePopup-run" type="button">Translate</button>' +
      '</div>' +
      '<div class="translatePopup-section translatePopup-source"><textarea class="translatePopup-sourceInput" placeholder="Select text in the PDF, then click Translate. You can also edit this text."></textarea></div>' +
      '<div class="translatePopup-section translatePopup-result">' +
      '<div class="translatePopup-resultText"></div>' +
      `<button class="translatePopup-copy" type="button" title="Copy translation" aria-label="Copy translation">${COPY_SVG}</button>` +
      '</div>';
    document.body.appendChild(root);
    srcSel = root.querySelector<HTMLSelectElement>('.translatePopup-srcLang')!;
    tgtSel = root.querySelector<HTMLSelectElement>('.translatePopup-tgtLang')!;
    sourceInput = root.querySelector<HTMLTextAreaElement>('.translatePopup-sourceInput')!;
    resultText = root.querySelector<HTMLDivElement>('.translatePopup-resultText')!;
    resultSection = root.querySelector<HTMLDivElement>('.translatePopup-result')!;

    root.querySelector('.translatePopup-close')!.addEventListener('click', close);
    root.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') close();
    });
    srcSel.addEventListener('change', () => {
      currentSrc = srcSel.value;
    });
    tgtSel.addEventListener('change', () => {
      currentTgt = tgtSel.value;
    });
    root.querySelector('.translatePopup-swap')!.addEventListener('click', () => {
      const previousSource = currentSrc === 'auto' ? 'en' : currentSrc;
      currentSrc = currentTgt;
      currentTgt = previousSource;
      srcSel.value = currentSrc;
      tgtSel.value = currentTgt;
    });
    root.querySelector('.translatePopup-run')!.addEventListener('click', request);
    root.querySelector('.translatePopup-copy')!.addEventListener('click', () => {
      const text = resultText.textContent || '';
      if (!text) return;
      void navigator.clipboard?.writeText(text);
    });
  };

  return {
    contains(node) {
      return !!(root && node && root.contains(node));
    },
    syncSelection(text) {
      if (!root || root.hidden) return;
      sourceInput.value = text;
    },
    open(text) {
      ensure();
      lastFocus = document.activeElement as HTMLElement | null;
      sourceInput.value = (text || '').trim();
      resultText.textContent = '';
      resultSection.classList.remove('error');
      root!.classList.remove('loading');
      srcSel.value = currentSrc;
      tgtSel.value = currentTgt;
      root!.hidden = false;
      sourceInput.focus();
    },
    append(requestId, chunk) {
      if (requestId !== requestSeq) return;
      resultText.textContent = (resultText.textContent ?? '') + (chunk ?? '');
    },
    finish(requestId) {
      if (requestId !== requestSeq) return;
      root!.classList.remove('loading');
    },
    error(requestId, msg) {
      if (requestId !== requestSeq) return;
      root!.classList.remove('loading');
      resultSection.classList.add('error');
      resultText.textContent = msg;
    },
  };
}
