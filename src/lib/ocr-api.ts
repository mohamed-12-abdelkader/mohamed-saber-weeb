import { isAxiosError } from 'axios';
import api from '@/lib/api';
import { convertPdfToOcrImages } from '@/lib/ocr-pdf-to-images';
import {
  batchFilesBySize,
  formatBytes,
  OCR_MAX_REQUEST_BYTES,
  prepareOcrFiles,
  shouldConvertPdfToImages,
  totalBytes,
} from '@/lib/ocr-upload-prepare';

export type OcrQuestionOption = {
  label?: string;
  text: string;
};

export type OcrQuestionImage = {
  image_id?: string;
  page_index?: number;
  image_blob?: string;
  image_mime_type?: string;
  short_description?: string;
};

export type OcrExtractedImage = OcrQuestionImage & {
  image_type?: string;
  summary?: string;
  educational_relevance?: string;
};

export type OcrExtractedQuestion = {
  number: number;
  source_number?: string;
  question_text: string;
  options: OcrQuestionOption[];
  question_images?: OcrQuestionImage[];
  correct_answer?: string | null;
  correct_answer_index?: number | null;
  correct_answer_inferred?: boolean;
};

export type OcrExtractionResult = {
  filename: string;
  mime_type: string;
  source_files?: Array<{
    filename: string;
    mime_type: string;
  }>;
  document_type: string;
  page_count: number;
  question_count: number;
  extracted_images?: OcrExtractedImage[];
  page_range?: {
    page_from: number;
    page_to: number;
  };
  content_format?: string;
  infer_correct_answer: boolean;
  questions: OcrExtractedQuestion[];
  notes?: string;
};

type ExtractOptions = {
  inferCorrectAnswer?: boolean;
  includeQuestionImages?: boolean;
  pageFrom?: number;
  pageTo?: number;
};

function isPdfFile(file: File) {
  return (
    file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  );
}

function isPayloadTooLargeError(error: unknown) {
  return (
    (error instanceof Error && error.message.includes('حجم الملفات كبير')) ||
    (isAxiosError(error) && error.response?.status === 413)
  );
}

function mergeExtractionResults(parts: OcrExtractionResult[]): OcrExtractionResult {
  const first = parts[0];
  const questions = parts.flatMap((part) => part.questions);
  const extracted_images = parts.flatMap((part) => part.extracted_images ?? []);
  const source_files = parts.flatMap((part) => part.source_files ?? []);
  const renumbered = questions.map((question, index) => ({
    ...question,
    number: index + 1,
  }));

  return {
    ...first,
    filename:
      parts.length === 1
        ? first.filename
        : `دفعة (${parts.length} طلبات)`,
    source_files: source_files.length ? source_files : first.source_files,
    page_count: Math.max(...parts.map((part) => part.page_count || 0), 0),
    question_count: renumbered.length,
    extracted_images: extracted_images.length ? extracted_images : first.extracted_images,
    page_range:
      first.page_range && parts[parts.length - 1]?.page_range
        ? {
            page_from: first.page_range.page_from,
            page_to: parts[parts.length - 1].page_range!.page_to,
          }
        : first.page_range,
    questions: renumbered,
    notes: [
      first.notes,
      parts.length > 1
        ? `تم التقسيم إلى ${parts.length} طلبات لتجنب تجاوز حجم الرفع.`
        : null,
    ]
      .filter(Boolean)
      .join(' '),
  };
}

async function postExtractOnce(
  files: File[],
  options: ExtractOptions,
  sendPageRange = true
): Promise<OcrExtractionResult> {
  const form = new FormData();
  for (const item of files) {
    form.append('file', item);
  }
  form.append(
    'infer_correct_answer',
    options.inferCorrectAnswer ? 'true' : 'false'
  );
  form.append(
    'include_question_images',
    options.includeQuestionImages === false ? 'false' : 'true'
  );
  if (
    sendPageRange &&
    options.pageFrom != null &&
    options.pageTo != null
  ) {
    form.append('page_from', String(options.pageFrom));
    form.append('page_to', String(options.pageTo));
  }

  try {
    const { data } = await api.post<{ data: OcrExtractionResult }>(
      '/api/ocr/extract-questions',
      form,
      {
        timeout: 180_000,
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      }
    );
    return data.data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 413) {
      const size = formatBytes(totalBytes(files));
      throw new Error(
        `حجم الملفات كبير جداً (${size}). يتم تحويل PDF إلى صور مضغوطة وتقسيم الرفع تلقائياً.`
      );
    }
    throw error;
  }
}

async function extractImageBatches(
  files: File[],
  options: ExtractOptions
): Promise<OcrExtractionResult> {
  const prepared = await prepareOcrFiles(files);

  async function extractImageBatch(batch: File[]): Promise<OcrExtractionResult[]> {
    try {
      // الصور لا تحتاج page_from/page_to
      return [await postExtractOnce(batch, options, false)];
    } catch (error) {
      if (!isPayloadTooLargeError(error) || batch.length <= 1) {
        throw error;
      }
      const mid = Math.ceil(batch.length / 2);
      const left = await extractImageBatch(batch.slice(0, mid));
      const right = await extractImageBatch(batch.slice(mid));
      return [...left, ...right];
    }
  }

  const batches = batchFilesBySize(prepared, OCR_MAX_REQUEST_BYTES);
  const parts: OcrExtractionResult[] = [];
  for (const batch of batches) {
    // ارفع صورة بصورة إن كانت الدفعة قد تتجاوز الحد
    if (batch.length > 1 && totalBytes(batch) > OCR_MAX_REQUEST_BYTES) {
      for (const single of batch) {
        parts.push(...(await extractImageBatch([single])));
      }
    } else {
      parts.push(...(await extractImageBatch(batch)));
    }
  }

  if (parts.length === 0) {
    throw new Error('تعذر استخراج أسئلة من الملفات.');
  }
  return parts.length === 1 ? parts[0] : mergeExtractionResults(parts);
}

async function extractPdfAsImages(
  pdf: File,
  options: ExtractOptions
): Promise<OcrExtractionResult> {
  const { images, pageCount } = await convertPdfToOcrImages(pdf, {
    pageFrom: options.pageFrom,
    pageTo: options.pageTo,
  });

  if (images.length === 0) {
    throw new Error('لم يتم تحويل أي صفحة من ملف PDF.');
  }

  const result = await extractImageBatches(images, options);
  return {
    ...result,
    filename: pdf.name,
    mime_type: 'application/pdf',
    document_type: result.document_type || 'pdf',
    page_count: pageCount,
    page_range:
      options.pageFrom != null && options.pageTo != null
        ? { page_from: options.pageFrom, page_to: options.pageTo }
        : { page_from: 1, page_to: pageCount },
    notes: [
      result.notes,
      `تم تحويل PDF (${formatBytes(pdf.size)}) إلى ${images.length} صورة مضغوطة على الجهاز قبل الرفع.`,
    ]
      .filter(Boolean)
      .join(' '),
  };
}

export async function extractQuestionsFromFile(
  file: File | File[],
  options: ExtractOptions = {}
): Promise<OcrExtractionResult> {
  const inputFiles = Array.isArray(file) ? file : [file];

  if (inputFiles.length === 1 && isPdfFile(inputFiles[0])) {
    const pdf = inputFiles[0];

    // ملف 4MB: تحويل لصور قبل أي رفع — لأن إرسال PDF كاملاً يسبب 413 حتى مع page_from/page_to
    if (shouldConvertPdfToImages(pdf)) {
      return extractPdfAsImages(pdf, options);
    }

    try {
      return await postExtractOnce([pdf], options, true);
    } catch (error) {
      if (isPayloadTooLargeError(error)) {
        return extractPdfAsImages(pdf, options);
      }
      throw error;
    }
  }

  return extractImageBatches(inputFiles, options);
}
