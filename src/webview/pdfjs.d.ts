// Minimal ambient surface for the pdfjs viewer globals the bootstrap touches.
// This is NOT the full pdfjs API — only the members actually used here. It is a
// global script (no import/export) so the two globals and these `Pdf*` types are
// ambient across the webview program (tsconfig.webview.json). The root tsconfig
// excludes src/webview, so none of this leaks into the host program.

interface PdfSerializable {
  hash?: string;
}

interface PdfAnnotationStorage {
  serializable?: PdfSerializable;
  size?: number;
}

interface PdfOutlineItem {
  title: string;
  dest: unknown;
  items?: PdfOutlineItem[];
}

interface PdfDocument {
  annotationStorage?: PdfAnnotationStorage;
  numPages?: number;
  fingerprints?: (string | null)[];
  getOutline?(): Promise<PdfOutlineItem[] | null>;
  saveDocument(): Promise<Uint8Array>;
  getData(): Promise<Uint8Array>;
  extractPages(params: unknown): Promise<Uint8Array>;
}

interface PdfLocation {
  pageNumber?: number;
  top?: number;
  left?: number;
  rotation?: number;
  scale?: number;
}

// Union of every `evt` field read across the eventBus handlers. All optional
// because the shape depends on the event name.
interface PdfEvent {
  isAllowed?: boolean;
  message?: string;
  reason?: string | null;
  outlineCount?: number;
  attachmentsCount?: number;
  layersCount?: number;
  pageNumber?: number;
  scale?: number;
  location?: PdfLocation;
  view?: number;
}

type PdfEventListener = (evt: PdfEvent) => void;

interface PdfEventBus {
  on(name: string, listener: PdfEventListener): void;
  off(name: string, listener: PdfEventListener): void;
}

interface PdfThumbnailViewer {
  hasStructuralChanges?(): boolean;
  getStructuralChanges(): unknown;
}

interface PdfScrollOptions {
  pageNumber: number;
  destArray?: unknown[];
  ignoreDestinationZoom?: boolean;
}

interface PdfViewer {
  currentPageNumber: number;
  currentScale?: number;
  pagesRotation: number;
  scrollPageIntoView(options: PdfScrollOptions): void;
}

interface PdfDownloadManager {
  download(data: Uint8Array | ArrayBuffer, url: string, filename?: string): void;
  downloadData(data: Uint8Array | ArrayBuffer, filename?: string): void;
  openOrDownloadData(data: Uint8Array | ArrayBuffer, filename?: string): boolean;
}

interface PdfOpenArgs {
  data?: Uint8Array;
  url?: string;
  useWorkerFetch?: boolean;
  password?: string;
  filename?: string;
}

interface PdfApplication {
  initializedPromise: Promise<void>;
  eventBus: PdfEventBus;
  pdfDocument?: PdfDocument | null;
  pdfThumbnailViewer?: PdfThumbnailViewer;
  pdfViewer?: PdfViewer;
  pdfHistory?: { back(): void; forward(): void };
  pdfLinkService?: { goToDestination?(dest: unknown): void };
  downloadManager?: PdfDownloadManager;
  secondaryToolbar?: { close(): void };
  pagesCount?: number;
  open(args: PdfOpenArgs): Promise<void>;
  _mergedDocumentNeedsSaving?: boolean;
  _docFilename?: string;
}

interface PdfApplicationOptions {
  set(name: string, value: unknown): void;
}

declare const PDFViewerApplication: PdfApplication;
declare const PDFViewerApplicationOptions: PdfApplicationOptions;
