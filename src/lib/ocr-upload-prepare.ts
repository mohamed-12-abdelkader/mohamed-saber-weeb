/** حد آمن — كثير من السيرفرات ترفض فوق 1MB */
export const OCR_MAX_REQUEST_BYTES = 900 * 1024;
const OCR_IMAGE_MAX_BYTES = 700 * 1024;
const OCR_IMAGE_MAX_EDGE = 1600;
/** حوّل PDF لصور إذا تجاوز هذا الحجم (حتى مع تحديد صفحات يبقى الملف كاملاً في الطلب) */
export const OCR_PDF_CONVERT_THRESHOLD = 900 * 1024;

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('تعذر قراءة الصورة للضغط'));
    };
    image.src = url;
  });
}

function isPdf(file: File) {
  return (
    file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  );
}

function isImage(file: File) {
  return (
    file.type.startsWith('image/') ||
    /\.(png|jpe?g|webp|gif|avif|bmp|tiff?)$/i.test(file.name)
  );
}

/** ضغط صور OCR مع الحفاظ على وضوح النص قدر الإمكان */
export async function compressOcrImage(file: File): Promise<File> {
  if (!isImage(file) || file.type === 'image/svg+xml') {
    return file;
  }
  if (file.size <= OCR_IMAGE_MAX_BYTES) {
    return file;
  }

  const image = await loadImage(file);
  let bestBlob: Blob | null = null;

  for (const maxEdge of [OCR_IMAGE_MAX_EDGE, 1280, 1024, 800, 640]) {
    const scale = Math.min(1, maxEdge / image.naturalWidth, maxEdge / image.naturalHeight);
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(image, 0, 0, width, height);

    for (const quality of [0.8, 0.7, 0.6, 0.5, 0.4]) {
      const blob = await canvasToBlob(canvas, 'image/jpeg', quality);
      if (!blob) continue;
      if (!bestBlob || blob.size < bestBlob.size) bestBlob = blob;
      if (blob.size <= OCR_IMAGE_MAX_BYTES) break;
    }
    if (bestBlob && bestBlob.size <= OCR_IMAGE_MAX_BYTES) break;
  }

  if (!bestBlob || bestBlob.size >= file.size) {
    return file;
  }

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'ocr-image';
  return new File([bestBlob], `${baseName}.jpg`, { type: 'image/jpeg' });
}

export async function prepareOcrFiles(files: File[]): Promise<File[]> {
  const prepared: File[] = [];
  for (const file of files) {
    prepared.push(isImage(file) ? await compressOcrImage(file) : file);
  }
  return prepared;
}

export function totalBytes(files: File[]) {
  return files.reduce((sum, file) => sum + file.size, 0);
}

/** تقسيم الصور إلى دفعات لا تتجاوز حد الطلب — صفحة واحدة لكل دفعة إن لزم */
export function batchFilesBySize(files: File[], maxBytes = OCR_MAX_REQUEST_BYTES): File[][] {
  if (files.length === 0) return [];
  const batches: File[][] = [];
  let current: File[] = [];
  let currentSize = 0;

  for (const file of files) {
    const nextSize = currentSize + file.size;
    if (current.length > 0 && nextSize > maxBytes) {
      batches.push(current);
      current = [file];
      currentSize = file.size;
    } else {
      current.push(file);
      currentSize = nextSize;
    }
  }
  if (current.length) batches.push(current);
  return batches;
}

export function shouldConvertPdfToImages(file: File) {
  return isPdf(file) && file.size > OCR_PDF_CONVERT_THRESHOLD;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
