import type { InboundMessage } from './types';
import type { HandlerContext } from './context';

type ExportMsg = Extract<InboundMessage, { type: 'exportBytes' }>;

export function handleExportBytes(msg: ExportMsg, ctx: HandlerContext): void {
  if (!(msg.bytes instanceof Uint8Array)) return;
  const filename = typeof msg.filename === 'string' ? msg.filename : undefined;
  void ctx.exportBytes(msg.bytes, filename);
}
