import * as vscode from 'vscode';
import type { InboundMessage } from './types';
import type { HandlerContext } from './context';

type DocLoadedMsg = Extract<InboundMessage, { type: 'documentloaded' }>;
type DocErrorMsg = Extract<InboundMessage, { type: 'documenterror' }>;
type PasswordMsg = Extract<InboundMessage, { type: 'password' }>;

export function handleRequestPdf(ctx: HandlerContext): void {
  ctx.sendBytesFromDisk();
}

export function handlePrint(ctx: HandlerContext): void {
  void vscode.env.openExternal(ctx.resource);
}

export function handleDocumentLoaded(msg: DocLoadedMsg, ctx: HandlerContext): void {
  ctx.logger.info('PDF loaded', ctx.resource.fsPath, `${msg.numPages ?? '?'} pages`, msg.fingerprint ?? '');
}

export function handleDocumentError(msg: DocErrorMsg, ctx: HandlerContext): void {
  const text = msg.reason ? `${msg.message}: ${msg.reason}` : (msg.message ?? vscode.l10n.t('Failed to load PDF'));
  ctx.logger.error('PDF document error', ctx.resource.fsPath, text);
  void vscode.window.showErrorMessage(vscode.l10n.t('PDF: {0}', text));
}

export function handlePassword(msg: PasswordMsg, ctx: HandlerContext): void {
  if (typeof msg.password !== 'string') return;
  ctx.setSessionPassword(msg.password);
}
