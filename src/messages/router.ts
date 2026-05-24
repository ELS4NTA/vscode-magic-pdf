import type { InboundMessage, InboundMessageType } from './types';
import type { HandlerContext } from './context';
import { handleTranslate } from './translateHandler';
import { handleOutline } from './outlineHandler';
import { handlePageInfo } from './pageInfoHandler';
import { handleSavedBytes } from './saveHandler';
import {
  handleDocumentError,
  handleDocumentLoaded,
  handlePassword,
  handlePrint,
  handleRequestPdf,
} from './documentLifecycleHandler';
import { handleToggleTheme, handleTogglePageColors } from './themeHandler';
import { handleExportBytes } from './exportHandler';
import { handleDirty, handleState } from './stateHandler';
import { handleLogError } from './logHandler';

type HandlerFor<K extends InboundMessageType> = (
  msg: Extract<InboundMessage, { type: K }>,
  ctx: HandlerContext
) => void;

type HandlerMap = { [K in InboundMessageType]: HandlerFor<K> };

const HANDLERS: HandlerMap = {
  requestPdf: (_msg, ctx) => handleRequestPdf(ctx),
  print: (_msg, ctx) => handlePrint(ctx),
  toggleTheme: (msg, ctx) => void handleToggleTheme(msg, ctx),
  togglePageColors: (msg, ctx) => void handleTogglePageColors(msg, ctx),
  outline: handleOutline,
  pageInfo: handlePageInfo,
  translate: handleTranslate,
  state: handleState,
  dirty: (_msg, ctx) => handleDirty(ctx),
  password: handlePassword,
  logError: handleLogError,
  exportBytes: handleExportBytes,
  documentloaded: handleDocumentLoaded,
  documenterror: handleDocumentError,
  savedBytes: handleSavedBytes,
};

/**
 * Dispatch a raw webview message to the right handler. The input is typed as
 * `unknown` because postMessage carries arbitrary JSON-clonable values — we
 * only commit to InboundMessage once `type` checks out as a known key.
 *
 * @param raw The raw message object received from the webview, expected to conform to the InboundMessage union type.
 * @param ctx The handler context, which provides handlers with access to the preview's resource, webview, logger, state, and operations.
 */
export function routeMessage(raw: unknown, ctx: HandlerContext): void {
  if (!raw || typeof raw !== 'object') {
    ctx.logger.warn('Unknown webview message', JSON.stringify(raw));
    return;
  }
  const msg = raw as { type?: string };
  if (!msg.type || !(msg.type in HANDLERS)) {
    ctx.logger.warn('Unknown webview message', JSON.stringify(raw));
    return;
  }
  const handler = HANDLERS[msg.type as InboundMessageType] as (m: InboundMessage, c: HandlerContext) => void;
  handler(raw as InboundMessage, ctx);
}
