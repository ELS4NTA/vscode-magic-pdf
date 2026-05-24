import type { InboundMessage } from './types';
import type { HandlerContext } from './context';

type SavedBytesMsg = Extract<InboundMessage, { type: 'savedBytes' }>;

export function handleSavedBytes(msg: SavedBytesMsg, ctx: HandlerContext): void {
  if (typeof msg.requestId !== 'number') return;
  if (msg.bytes !== undefined && !(msg.bytes instanceof Uint8Array)) return;
  ctx.saveQueue.resolve(msg);
}
