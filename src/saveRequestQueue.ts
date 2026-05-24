export interface SavedBytesMessage {
  requestId?: number;
  bytes?: Uint8Array;
  error?: string;
  noChange?: boolean;
}

type Pending = {
  resolve: (b: Uint8Array | null) => void;
  reject: (e: Error) => void;
};

/**
 * Coordinates async save requests between the host and the webview. Each
 * request() posts a 'requestSave' message with a unique id; resolve() looks
 * up the matching pending promise when the webview replies with 'savedBytes'.
 */
export class SaveRequestQueue {
  private readonly pending = new Map<number, Pending>();
  private seq = 0;

  public constructor(private readonly postRequest: (requestId: number) => void) {}

  public request(): Promise<Uint8Array | null> {
    const requestId = ++this.seq;
    return new Promise<Uint8Array | null>((resolve, reject) => {
      this.pending.set(requestId, { resolve, reject });
      this.postRequest(requestId);
    });
  }

  public resolve(message: SavedBytesMessage): void {
    const id = message.requestId ?? -1;
    const p = this.pending.get(id);
    if (!p) return;
    this.pending.delete(id);
    if (message.error) p.reject(new Error(message.error));
    else if (message.noChange) p.resolve(null);
    else if (message.bytes) p.resolve(message.bytes);
    else p.reject(new Error('saveDocument returned no bytes'));
  }

  public dispose(): void {
    for (const { reject } of this.pending.values()) {
      reject(new Error('Preview disposed'));
    }
    this.pending.clear();
  }
}
