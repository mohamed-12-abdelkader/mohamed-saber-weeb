/** مسار API مكتبة الأسئلة (Admin) — انظر docs/question-library-apis.md */

export const QUESTION_LIBRARY_API_PREFIX = '/api/admin/question-library';

export type Course = {
  id: number;
  library_id: number;
  title: string;
  description: string | null;
  lesson_count?: number;
  created_at: string;
  updated_at: string;
};

export type Lesson = {
  id: number;
  course_id: number;
  title: string;
  description: string | null;
  position: number;
  question_count?: number;
  created_at: string;
  updated_at: string;
};

export type QuestionOption = {
  id?: number;
  question_id?: number;
  option_key: 'A' | 'B' | 'C' | 'D';
  option_text: string;
  is_correct?: boolean;
};

export type QuestionListItem = {
  question_id: number;
  question_image_url: string | null;
  question_image_blob?: string | null;
  question_image_mime_type?: string | null;
  prompt_text: string | null;
  lesson: { id: number; title: string };
  course: { id: number; title: string };
  options: QuestionOption[];
};

export type QuestionDetail = {
  id: number;
  lesson_id: number;
  question_image_url: string | null;
  question_image_blob?: string | null;
  question_image_mime_type?: string | null;
  prompt_text: string | null;
  created_at: string;
  updated_at: string;
  options: QuestionOption[];
};

/** استيراد bulk-arabic-text — يضيف source_index لكل سؤال */
export type ArabicBulkImportedQuestion = QuestionDetail & {
  source_index: number;
};

export type OptionKey = 'A' | 'B' | 'C' | 'D';

export const OPTION_KEYS: readonly OptionKey[] = ['A', 'B', 'C', 'D'];
