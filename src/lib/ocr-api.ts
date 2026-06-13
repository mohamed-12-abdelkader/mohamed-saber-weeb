import api from '@/lib/api';

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

export async function extractQuestionsFromFile(
  file: File | File[],
  options: {
    inferCorrectAnswer?: boolean;
    includeQuestionImages?: boolean;
    pageFrom?: number;
    pageTo?: number;
  } = {}
): Promise<OcrExtractionResult> {
  const files = Array.isArray(file) ? file : [file];
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
  if (options.pageFrom != null && options.pageTo != null) {
    form.append('page_from', String(options.pageFrom));
    form.append('page_to', String(options.pageTo));
  }

  const { data } = await api.post<{ data: OcrExtractionResult }>(
    '/api/ocr/extract-questions',
    form
  );
  return data.data;
}
