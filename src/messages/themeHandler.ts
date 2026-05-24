import * as vscode from 'vscode';
import type { InboundMessage } from './types';
import type { HandlerContext } from './context';
import { resolveTheme, type PageColorsName, type ThemeName } from '../pdfOptions';

type ToggleThemeMsg = Extract<InboundMessage, { type: 'toggleTheme' }>;
type TogglePageColorsMsg = Extract<InboundMessage, { type: 'togglePageColors' }>;

/**
 * Toggling theme / page-colors re-renders the whole webview. That throws
 * away the live pdfjs session, including any annotation/page edits not yet
 * written to disk. When the webview reports pending edits (msg.dirty), confirm
 * before reloading so the user doesn't silently lose them. Returns true to
 * proceed, false to abort.
 *
 * @param dirty The dirty state reported by the webview, indicating whether there are unsaved edits that would be lost by toggling.
 * @returns A promise that resolves to true if the toggle should proceed (user confirmed or no unsaved edits),
 *  or false if it should be aborted (user canceled).
 */
async function confirmDiscardIfDirty(dirty: boolean | undefined): Promise<boolean> {
  if (!dirty) return true;

  const discardAction = vscode.l10n.t('Discard & Switch');
  const choice = await vscode.window.showWarningMessage(
    vscode.l10n.t(
      'Switching the view will reload the document and discard your unsaved edits. Save first, or discard them?'
    ),
    { modal: true },
    discardAction
  );

  return choice === discardAction;
}

/**
 * Manual theme toggle from the toolbar button. View position is preserved
 * via the existing state persistence.
 *
 * @param msg The message, which carries the current dirty state to confirm before toggling.
 * @param ctx The handler context, which provides access to the preference store to update the override and triggers a re-render.
 * @returns A promise that resolves when the operation is complete.
 */
export async function handleToggleTheme(msg: ToggleThemeMsg, ctx: HandlerContext): Promise<void> {
  if (!(await confirmDiscardIfDirty(msg.dirty))) return;

  const next: ThemeName = resolveTheme(ctx.prefs.themeOverride()) === 'dark' ? 'light' : 'dark';

  void ctx.prefs.setThemeOverride(next);
  ctx.renderHtml();
}

/**
 * Independent toggle for page canvas inversion. Effective state is derived
 * in resolvePagesInverted (override wins, else dark theme inverts).
 *
 * @param msg The message, which carries the current dirty state to confirm before toggling.
 * @param ctx The handler context, which provides access to the preference store to update the override and triggers a re-render.
 * @returns A promise that resolves when the operation is complete.
 */
export async function handleTogglePageColors(msg: TogglePageColorsMsg, ctx: HandlerContext): Promise<void> {
  if (!(await confirmDiscardIfDirty(msg.dirty))) return;

  const current = ctx.prefs.pageColorsOverride();
  const themeIsDark = resolveTheme(ctx.prefs.themeOverride()) === 'dark';
  const effectiveInverted = current === 'inverted' || (current === undefined && themeIsDark);
  const next: PageColorsName = effectiveInverted ? 'normal' : 'inverted';

  void ctx.prefs.setPageColorsOverride(next);
  ctx.renderHtml();
}
