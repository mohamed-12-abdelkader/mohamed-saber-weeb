import api from '@/lib/api';
import type {
  ArabicBulkImportedQuestion,
  Course,
  Lesson,
  QuestionDetail,
  QuestionListItem,
} from '@/types/question-library';

const BASE = '/api/admin/question-library';

export async function fetchCourses(): Promise<Course[]> {
  const { data } = await api.get<{ courses: Course[] }>(`${BASE}/courses`);
  return data.courses;
}

export async function createCourse(payload: {
  title: string;
  description?: string;
}): Promise<Course> {
  const { data } = await api.post<{ course: Course }>(`${BASE}/courses`, payload);
  return data.course;
}

export async function updateCourse(
  courseId: number,
  payload: { title?: string; description?: string }
): Promise<Course> {
  const { data } = await api.patch<{ course: Course }>(
    `${BASE}/courses/${courseId}`,
    payload
  );
  return data.course;
}

export async function deleteCourse(courseId: number): Promise<void> {
  await api.delete(`${BASE}/courses/${courseId}`);
}

export async function fetchLessons(courseId: number): Promise<Lesson[]> {
  const { data } = await api.get<{ lessons: Lesson[] }>(
    `${BASE}/courses/${courseId}/lessons`
  );
  return data.lessons;
}

export async function createLesson(
  courseId: number,
  payload: { title: string; description?: string; position?: number }
): Promise<Lesson> {
  const { data } = await api.post<{ lesson: Lesson }>(
    `${BASE}/courses/${courseId}/lessons`,
    payload
  );
  return data.lesson;
}

export async function updateLesson(
  lessonId: number,
  payload: { title?: string; description?: string; position?: number }
): Promise<Lesson> {
  const { data } = await api.patch<{ lesson: Lesson }>(
    `${BASE}/lessons/${lessonId}`,
    payload
  );
  return data.lesson;
}

export async function deleteLesson(lessonId: number): Promise<void> {
  await api.delete(`${BASE}/lessons/${lessonId}`);
}

export async function fetchQuestions(params: {
  course_id?: number;
  lesson_id?: number;
}): Promise<QuestionListItem[]> {
  const { data } = await api.get<{ questions: QuestionListItem[] }>(
    `${BASE}/questions`,
    { params }
  );
  return data.questions;
}

export async function createMcqQuestion(
  lessonId: number,
  payload: {
    prompt_text: string;
    question_image_blob?: string;
    question_image_mime_type?: string;
    options: { option_key: 'A' | 'B' | 'C' | 'D'; option_text: string }[];
    correct_option_key: 'A' | 'B' | 'C' | 'D';
  }
): Promise<QuestionDetail> {
  const { data } = await api.post<{ question: QuestionDetail }>(
    `${BASE}/lessons/${lessonId}/questions`,
    payload
  );
  return data.question;
}

export async function bulkArabicTextQuestions(
  lessonId: number,
  payload: { text: string; once_per_lesson?: boolean }
): Promise<{ questions: ArabicBulkImportedQuestion[]; count: number }> {
  const { data } = await api.post<{
    questions: ArabicBulkImportedQuestion[];
    count: number;
  }>(`${BASE}/lessons/${lessonId}/questions/bulk-arabic-text`, payload);
  return data;
}

export async function bulkUploadQuestionImages(
  lessonId: number,
  files: File[],
  meta?: { prompt_text?: string }
): Promise<{ questions: QuestionDetail[]; count: number }> {
  const form = new FormData();
  if (meta) {
    form.append('meta', JSON.stringify(meta));
  }
  for (const file of files) {
    form.append('images', file);
  }
  const { data } = await api.post<{
    questions: QuestionDetail[];
    count: number;
  }>(`${BASE}/lessons/${lessonId}/questions/bulk-images`, form);
  return data;
}

export async function putQuestionOptions(
  questionId: number,
  payload: {
    options: { option_key: 'A' | 'B' | 'C' | 'D'; option_text: string }[];
    correct_option_key: 'A' | 'B' | 'C' | 'D';
  }
): Promise<void> {
  await api.put(`${BASE}/questions/${questionId}/options`, payload);
}

export async function updateQuestion(
  questionId: number,
  payload: {
    prompt_text?: string | null;
    question_image_url?: string;
    question_image_blob?: string | null;
    question_image_mime_type?: string | null;
  }
): Promise<QuestionDetail> {
  const { data } = await api.patch<{ question: QuestionDetail }>(
    `${BASE}/questions/${questionId}`,
    payload
  );
  return data.question;
}

export async function deleteQuestion(questionId: number): Promise<void> {
  await api.delete(`${BASE}/questions/${questionId}`);
}
