import type { InboundMessage } from './types';
import type { HandlerContext } from './context';

type LogErrorMsg = Extract<InboundMessage, { type: 'logError' }>;

/**
 * Surface webview-side failures in the host's "Magic PDF" output channel.
 * pdfjs runs inside the webview iframe, so its uncaught errors and our
 * bootstrap failures otherwise only reach the webview devtools console.
 *
 * @param msg The log message, with optional detail (e.g. stack trace) and severity level.
 * @param ctx The handler context, which provides access to the host logger.
 */
export function handleLogError(msg: LogErrorMsg, ctx: HandlerContext): void {
  const text = msg.detail ? `${msg.message}\n${msg.detail}` : msg.message;
  if (msg.level === 'warn') {
    ctx.logger.warn('[webview]', text);
  } else {
    ctx.logger.error('[webview]', text);
  }
}
