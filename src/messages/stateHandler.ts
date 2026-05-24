import type { InboundMessage } from './types';
import type { HandlerContext } from './context';

type StateMsg = Extract<InboundMessage, { type: 'state' }>;

export function handleState(msg: StateMsg, ctx: HandlerContext): void {
  const payload = msg.payload;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return;
  void ctx.state.update(ctx.stateKey, payload);
}

export function handleDirty(ctx: HandlerContext): void {
  ctx.markDirty();
}
