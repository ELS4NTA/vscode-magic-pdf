import { describe, it, expect, vi } from 'vitest';
import { routeMessage } from '../src/messages/router';
import type { HandlerContext } from '../src/messages/context';

function stubContext() {
  const ctx = {
    logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn(), debug: vi.fn() },
    sendBytesFromDisk: vi.fn(),
    markDirty: vi.fn(),
  };
  return ctx as unknown as HandlerContext & typeof ctx;
}

describe('routeMessage', () => {
  it('warns and bails on a non-object message', () => {
    const ctx = stubContext();
    routeMessage(null, ctx);
    expect(ctx.logger.warn).toHaveBeenCalledOnce();
  });

  it('warns on a primitive message', () => {
    const ctx = stubContext();
    routeMessage('not-an-object', ctx);
    expect(ctx.logger.warn).toHaveBeenCalledOnce();
  });

  it('warns when the message has no type', () => {
    const ctx = stubContext();
    routeMessage({}, ctx);
    expect(ctx.logger.warn).toHaveBeenCalledOnce();
  });

  it('warns on an unknown type', () => {
    const ctx = stubContext();
    routeMessage({ type: 'does-not-exist' }, ctx);
    expect(ctx.logger.warn).toHaveBeenCalledOnce();
  });

  it('dispatches a known message to its handler', () => {
    const ctx = stubContext();
    routeMessage({ type: 'requestPdf' }, ctx);
    expect(ctx.sendBytesFromDisk).toHaveBeenCalledOnce();
    expect(ctx.logger.warn).not.toHaveBeenCalled();
  });

  it('routes each type to the right handler', () => {
    const ctx = stubContext();
    routeMessage({ type: 'dirty' }, ctx);
    expect(ctx.markDirty).toHaveBeenCalledOnce();
    expect(ctx.sendBytesFromDisk).not.toHaveBeenCalled();
  });
});
