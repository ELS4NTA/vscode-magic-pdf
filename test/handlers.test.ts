import { describe, it, expect, vi } from 'vitest';
import { handleExportBytes } from '../src/messages/exportHandler';
import { handleSavedBytes } from '../src/messages/saveHandler';
import { handleState } from '../src/messages/stateHandler';
import { handlePassword } from '../src/messages/documentLifecycleHandler';
import type { HandlerContext } from '../src/messages/context';

function stubContext() {
  const ctx = {
    exportBytes: vi.fn(),
    saveQueue: { resolve: vi.fn() },
    state: { update: vi.fn() },
    stateKey: 'view:test',
    setSessionPassword: vi.fn(),
  };
  return ctx as unknown as HandlerContext & typeof ctx;
}

const asMsg = <T>(v: T) => v as never;

describe('handleExportBytes guard', () => {
  it('exports when bytes is a real Uint8Array', () => {
    const ctx = stubContext();
    const bytes = new Uint8Array([1, 2]);
    handleExportBytes(asMsg({ type: 'exportBytes', bytes, filename: 'a.pdf' }), ctx);
    expect(ctx.exportBytes).toHaveBeenCalledWith(bytes, 'a.pdf');
  });

  it('rejects bytes that is not a Uint8Array', () => {
    const ctx = stubContext();
    handleExportBytes(asMsg({ type: 'exportBytes', bytes: 'not bytes' }), ctx);
    expect(ctx.exportBytes).not.toHaveBeenCalled();
  });

  it('drops a non-string filename to undefined', () => {
    const ctx = stubContext();
    const bytes = new Uint8Array([1]);
    handleExportBytes(asMsg({ type: 'exportBytes', bytes, filename: 42 }), ctx);
    expect(ctx.exportBytes).toHaveBeenCalledWith(bytes, undefined);
  });
});

describe('handleSavedBytes guard', () => {
  it('resolves the queue on a well-formed message', () => {
    const ctx = stubContext();
    const msg = { type: 'savedBytes', requestId: 1, bytes: new Uint8Array([1]) };
    handleSavedBytes(asMsg(msg), ctx);
    expect(ctx.saveQueue.resolve).toHaveBeenCalledWith(msg);
  });

  it('ignores a non-numeric requestId', () => {
    const ctx = stubContext();
    handleSavedBytes(asMsg({ type: 'savedBytes', requestId: '1' }), ctx);
    expect(ctx.saveQueue.resolve).not.toHaveBeenCalled();
  });

  it('ignores bytes that is present but not a Uint8Array', () => {
    const ctx = stubContext();
    handleSavedBytes(asMsg({ type: 'savedBytes', requestId: 1, bytes: [1, 2, 3] }), ctx);
    expect(ctx.saveQueue.resolve).not.toHaveBeenCalled();
  });
});

describe('handleState guard', () => {
  it('persists a plain object payload', () => {
    const ctx = stubContext();
    const payload = { page: 3 };
    handleState(asMsg({ type: 'state', payload }), ctx);
    expect(ctx.state.update).toHaveBeenCalledWith('view:test', payload);
  });

  it('rejects an array payload', () => {
    const ctx = stubContext();
    handleState(asMsg({ type: 'state', payload: [1, 2] }), ctx);
    expect(ctx.state.update).not.toHaveBeenCalled();
  });

  it('rejects a primitive payload', () => {
    const ctx = stubContext();
    handleState(asMsg({ type: 'state', payload: 'oops' }), ctx);
    expect(ctx.state.update).not.toHaveBeenCalled();
  });
});

describe('handlePassword guard', () => {
  it('stores a string password', () => {
    const ctx = stubContext();
    handlePassword(asMsg({ type: 'password', password: 'hunter2' }), ctx);
    expect(ctx.setSessionPassword).toHaveBeenCalledWith('hunter2');
  });

  it('ignores a non-string password', () => {
    const ctx = stubContext();
    handlePassword(asMsg({ type: 'password', password: 12345 }), ctx);
    expect(ctx.setSessionPassword).not.toHaveBeenCalled();
  });
});
