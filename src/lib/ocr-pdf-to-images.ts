/** تحويل صفحات PDF إلى صور JPEG على المتصفح لتقليل حجم الرفع (حل 413). */

type PdfJsViewport = { width: number; height: number };

type PdfJsPage = {
  getViewport: (opts: { scale: number }) => PdfJsViewport;
  render: (opts: {
    canvasContext: CanvasRenderingContext2D;
    viewport: PdfJsViewport;
  }) => { promise: Promise<void> };
};

type PdfJsDocument = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfJsPage>;
};

type PdfJsLib = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (src: { data: ArrayBuffer; disableWorker?: boolean }) => {
    promise: Promise<PdfJsDocument>;
  };
};

const PDFJS_VERSION = '3.11.174';
const PDFJS_SCRIPT = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.min.js`;
const PDFJS_WORKER = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;

const PAGE_TARGET_BYTES = 700 * 1024;
const PAGE_MAX_EDGE = 1600;

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}

function getPdfJsFromWindow(): PdfJsLib | null {
  const lib = (window as unknown as { pdfjsLib?: PdfJsLib }).pdfjsLib;
  return lib ?? null;
}

async function loadPdfJs(): Promise<PdfJsLib> {
  const existingLib = getPdfJsFromWindow();
  if (existingLib) {
    existingLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
    return existingLib;
  }

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[data-ocr-pdfjs="1"]`
    );
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener(
        'error',
        () => reject(new Error('تعذر تحميل محرك قراءة PDF')),
        { once: true }
      );
      return;
    }

    const script = document.createElement('script');
    script.src = PDFJS_SCRIPT;
    script.async = true;
    script.dataset.ocrPdfjs = '1';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('تعذر تحميل محرك قراءة PDF من الشبكة'));
    document.head.appendChild(script);
  });

  const lib = getPdfJsFromWindow();
  if (!lib) {
    throw new Error('محرك قراءة PDF غير متاح بعد التحميل');
  }
  lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
  return lib;
}

async function renderPageToJpeg(
  page: PdfJsPage,
  fileBase: string,
  pageNumber: number
): Promise<File> {
  const baseViewport = page.getViewport({ scale: 1 });
  const scale = Math.min(
    2,
    PAGE_MAX_EDGE / Math.max(baseViewport.width, baseViewport.height)
  );
  const viewport = page.getViewport({ scale: Math.max(0.8, scale) });
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('تعذر تجهيز Canvas لتحويل صفحة PDF');
  }

  await page.render({ canvasContext: ctx, viewport }).promise;

  let bestBlob: Blob | null = null;
  for (const quality of [0.82, 0.72, 0.62, 0.52, 0.42]) {
    const blob = await canvasToBlob(canvas, 'image/jpeg', quality);
    if (!blob) continue;
    if (!bestBlob || blob.size < bestBlob.size) bestBlob = blob;
    if (blob.size <= PAGE_TARGET_BYTES) break;
  }

  // إن بقيت كبيرة: صغّر الأبعاد أكثر
  if (bestBlob && bestBlob.size > PAGE_TARGET_BYTES) {
    for (const shrink of [0.75, 0.6, 0.5]) {
      const small = document.createElement('canvas');
      small.width = Math.max(1, Math.floor(canvas.width * shrink));
      small.height = Math.max(1, Math.floor(canvas.height * shrink));
      const sctx = small.getContext('2d');
      if (!sctx) break;
      sctx.drawImage(canvas, 0, 0, small.width, small.height);
      for (const quality of [0.7, 0.55, 0.4]) {
        const blob = await canvasToBlob(small, 'image/jpeg', quality);
        if (!blob) continue;
        if (!bestBlob || blob.size < bestBlob.size) bestBlob = blob;
        if (blob.size <= PAGE_TARGET_BYTES) break;
      }
      if (bestBlob && bestBlob.size <= PAGE_TARGET_BYTES) break;
    }
  }

  if (!bestBlob) {
    throw new Error(`تعذر تحويل الصفحة ${pageNumber} من PDF`);
  }

  return new File([bestBlob], `${fileBase}-p${pageNumber}.jpg`, {
    type: 'image/jpeg',
  });
}

export async function convertPdfToOcrImages(
  file: File,
  options: { pageFrom?: number; pageTo?: number } = {}
): Promise<{ images: File[]; pageCount: number }> {
  const pdfjs = await loadPdfJs();
  const data = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data }).promise;
  const pageCount = doc.numPages;
  const from = Math.max(1, options.pageFrom ?? 1);
  const to = Math.min(pageCount, options.pageTo ?? pageCount);

  if (from > to) {
    throw new Error('نطاق الصفحات غير صالح بالنسبة لملف PDF.');
  }

  const fileBase = file.name.replace(/\.pdf$/i, '') || 'pdf';
  const images: File[] = [];

  for (let pageNumber = from; pageNumber <= to; pageNumber += 1) {
    const page = await doc.getPage(pageNumber);
    images.push(await renderPageToJpeg(page, fileBase, pageNumber));
  }

  return { images, pageCount };
}
