// Polyfills required by pdfjs that are missing in VS Code's Chromium build.
// Loaded as a <script> in the webview (main thread) and also prepended to the
// worker bundle (worker thread) so both contexts have the same built-ins.

Math.sumPrecise ??= function (iterable) {
  let sum = 0;
  let compensation = 0;
  for (const v of iterable) {
    const x = +v;
    const t = sum + x;
    compensation += Math.abs(sum) >= Math.abs(x) ? sum - t + x : x - t + sum;
    sum = t;
  }
  return sum + compensation;
};

Map.prototype.getOrInsertComputed ??= function (k, f) {
  if (!this.has(k)) this.set(k, f(k));
  return this.get(k);
};

if (typeof Blob !== 'undefined' && !Blob.prototype.bytes) {
  Blob.prototype.bytes = async function () {
    return new Uint8Array(await this.arrayBuffer());
  };
}
