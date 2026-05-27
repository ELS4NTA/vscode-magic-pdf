import { describe, it, expect, vi } from 'vitest';
import { SaveRequestQueue } from '../src/saveRequestQueue';

describe('SaveRequestQueue', () => {
  it('posts a request with an incrementing id', () => {
    const post = vi.fn();
    const queue = new SaveRequestQueue(post);

    void queue.request();
    void queue.request();

    expect(post).toHaveBeenNthCalledWith(1, 1);
    expect(post).toHaveBeenNthCalledWith(2, 2);
  });

  it('resolves the matching request with the returned bytes', async () => {
    const queue = new SaveRequestQueue(() => {});
    const promise = queue.request();

    const bytes = new Uint8Array([1, 2, 3]);
    queue.resolve({ requestId: 1, bytes });

    await expect(promise).resolves.toBe(bytes);
  });

  it('resolves with null when the webview reports no change', async () => {
    const queue = new SaveRequestQueue(() => {});
    const promise = queue.request();

    queue.resolve({ requestId: 1, noChange: true });

    await expect(promise).resolves.toBeNull();
  });

  it('rejects with the reported error', async () => {
    const queue = new SaveRequestQueue(() => {});
    const promise = queue.request();

    queue.resolve({ requestId: 1, error: 'boom' });

    await expect(promise).rejects.toThrow('boom');
  });

  it('rejects when no bytes, noChange, nor error are present', async () => {
    const queue = new SaveRequestQueue(() => {});
    const promise = queue.request();

    queue.resolve({ requestId: 1 });

    await expect(promise).rejects.toThrow('saveDocument returned no bytes');
  });

  it('ignores a reply for an unknown request id', async () => {
    const queue = new SaveRequestQueue(() => {});
    const promise = queue.request();

    // A stale / mismatched reply must not throw and must leave the real
    // request still pending and resolvable.
    expect(() => queue.resolve({ requestId: 999, bytes: new Uint8Array([9]) })).not.toThrow();

    const bytes = new Uint8Array([1]);
    queue.resolve({ requestId: 1, bytes });
    await expect(promise).resolves.toBe(bytes);
  });

  it('treats a missing requestId as no match', () => {
    const queue = new SaveRequestQueue(() => {});
    void queue.request();

    expect(() => queue.resolve({ bytes: new Uint8Array([1]) })).not.toThrow();
  });

  it('correlates concurrent requests independently', async () => {
    const queue = new SaveRequestQueue(() => {});
    const first = queue.request();
    const second = queue.request();

    // Resolve out of order to prove ids drive correlation, not arrival order.
    queue.resolve({ requestId: 2, bytes: new Uint8Array([2]) });
    queue.resolve({ requestId: 1, bytes: new Uint8Array([1]) });

    await expect(first).resolves.toEqual(new Uint8Array([1]));
    await expect(second).resolves.toEqual(new Uint8Array([2]));
  });

  it('rejects every pending request on dispose', async () => {
    const queue = new SaveRequestQueue(() => {});
    const first = queue.request();
    const second = queue.request();

    queue.dispose();

    await expect(first).rejects.toThrow('Preview disposed');
    await expect(second).rejects.toThrow('Preview disposed');
  });
});
