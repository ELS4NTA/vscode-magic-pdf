import type { InboundMessage } from './types';
import type { HandlerContext } from './context';

type OutlineMsg = Extract<InboundMessage, { type: 'outline' }>;

export function handleOutline(msg: OutlineMsg, ctx: HandlerContext): void {
  ctx.outlineStore.set(ctx.resource, msg.outline ?? []);
}
