import api from '@/lib/api';
import type { AdminCourse, AdminCourseType } from '@/lib/admin-courses-api';

const BASE = '/api/admin/course-management';

export type CourseLessonFilePayload = {
  file_url: string;
  file_type: string;
};

export type CourseLessonFile = CourseLessonFilePayload & {
  id: number;
  lesson_id: number;
  created_at: string;
};

export type CourseLesson = {
  id: number;
  course_level_id: number;
  title: string;
  description: string | null;
  video_url: string | null;
  position: number;
  created_at?: string;
  files?: CourseLessonFile[];
};

export type CourseLevelExam = {
  id: number;
  course_level_id: number;
  title: string;
  pass_percentage: number;
  duration_minutes?: number | null;
  is_active: boolean;
  max_attempts?: number | null;
  questions_per_attempt?: number | null;
  created_at: string;
};

export type CourseLevel = {
  id: number;
  course_id: number;
  title: string;
  description: string | null;
  position: number;
  created_at?: string;
  lessons?: CourseLesson[];
  level_exam?: CourseLevelExam | null;
};

export type CourseGeneralExam = {
  id: number;
  course_id: number;
  title: string;
  is_final: boolean;
  is_level_promotion?: boolean;
  duration_minutes?: number | null;
  expected_question_count?: number | null;
  pass_percentage: number | null;
  is_active: boolean;
  max_attempts?: number | null;
  questions_per_attempt?: number | null;
  question_count?: number;
  created_at: string;
};

export type CourseStudent = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  enrolled_at: string;
};

export type CourseStudentsResponse = {
  students: CourseStudent[];
  total: number;
  limit: number;
  skip: number;
};

export type CourseDetailsResponse = {
  course: AdminCourse & {
    course_type?: AdminCourseType;
  };
  levels: CourseLevel[];
  general_exams: CourseGeneralExam[];
};

export type McqOptionPayload = {
  text: string;
  is_correct: boolean;
  position?: number;
};

export type McqQuestionPayload = {
  text: string;
  image_url?: string | null;
  image_blob?: string | null;
  image_mime_type?: string | null;
  position?: number;
  options: McqOptionPayload[];
};

export type LevelExamOption = {
  id: number;
  question_id?: number;
  text: string;
  is_correct: boolean;
  position: number;
};

export type LevelExamQuestion = {
  id: number;
  level_exam_id?: number;
  text: string;
  image_url: string | null;
  image_blob?: string | null;
  image_mime_type?: string | null;
  position: number;
  options: LevelExamOption[];
};

export type LevelExamAttempt = {
  id: number;
  student: {
    id: number;
    name: string;
    email: string;
  };
  started_at: string;
  expires_at: string | null;
  submitted_at: string | null;
  status: 'started' | 'submitted' | 'expired' | string;
  result: {
    score: number;
    max_score: number;
    percentage: number;
    passed: boolean;
  } | null;
};

export type CourseLevelPayload = {
  title: string;
  description?: string | null;
  position?: number;
};

export type CourseLessonPayload = {
  title: string;
  description?: string | null;
  video_url?: string | null;
  position?: number;
};

export type LevelExamPayload = {
  title: string;
  pass_percentage: number;
  duration_minutes?: number | null;
  is_active?: boolean;
  max_attempts?: number | null;
  questions_per_attempt?: number | null;
};

function questionBody(payload: McqQuestionPayload, image?: File | null) {
  if (!image) return payload;
  const form = new FormData();
  form.append('data', JSON.stringify(payload));
  form.append('image', image);
  return form;
}

export async function fetchCourseDetails(
  courseId: number
): Promise<CourseDetailsResponse> {
  const { data } = await api.get<CourseDetailsResponse>(
    `/api/courses/${courseId}/details`
  );
  return data;
}

export async function createCourseLevel(
  courseId: number,
  payload: CourseLevelPayload
): Promise<CourseLevel> {
  const { data } = await api.post<{ level: CourseLevel }>(
    `${BASE}/courses/${courseId}/levels`,
    payload
  );
  return data.level;
}

export async function updateCourseLevel(
  levelId: number,
  payload: CourseLevelPayload
): Promise<CourseLevel> {
  const { data } = await api.patch<{ level: CourseLevel }>(
    `${BASE}/levels/${levelId}`,
    payload
  );
  return data.level;
}

export async function deleteCourseLevel(levelId: number): Promise<void> {
  await api.delete(`${BASE}/levels/${levelId}`);
}

export async function createLevelLesson(
  levelId: number,
  payload: CourseLessonPayload & { files?: CourseLessonFilePayload[] }
): Promise<{ lesson: CourseLesson; files: CourseLessonFile[] }> {
  const { data } = await api.post<{
    lesson: CourseLesson;
    files: CourseLessonFile[];
  }>(`${BASE}/levels/${levelId}/lessons`, payload);
  return data;
}

export async function updateLevelLesson(
  lessonId: number,
  payload: CourseLessonPayload
): Promise<CourseLesson> {
  const { data } = await api.patch<{ lesson: CourseLesson }>(
    `${BASE}/lessons/${lessonId}`,
    payload
  );
  return data.lesson;
}

export async function deleteLevelLesson(lessonId: number): Promise<void> {
  await api.delete(`${BASE}/lessons/${lessonId}`);
}

export async function createLevelExam(
  levelId: number,
  payload: LevelExamPayload
): Promise<CourseLevelExam> {
  const { data } = await api.post<{ exam: CourseLevelExam }>(
    `${BASE}/levels/${levelId}/exam`,
    payload
  );
  return data.exam;
}

export async function updateLevelExam(
  examId: number,
  payload: LevelExamPayload
): Promise<CourseLevelExam> {
  const { data } = await api.patch<{ exam: CourseLevelExam }>(
    `${BASE}/level-exams/${examId}`,
    payload
  );
  return data.exam;
}

export async function updateLevelExamStatus(
  examId: number,
  isActive: boolean
): Promise<CourseLevelExam> {
  const { data } = await api.patch<{ exam: CourseLevelExam }>(
    `${BASE}/level-exams/${examId}/status`,
    { is_active: isActive }
  );
  return data.exam;
}

export async function deleteLevelExam(examId: number): Promise<void> {
  await api.delete(`${BASE}/level-exams/${examId}`);
}

export async function createLevelExamQuestion(
  examId: number,
  payload: McqQuestionPayload,
  image?: File | null
): Promise<void> {
  await api.post(
    `${BASE}/level-exams/${examId}/questions`,
    questionBody(payload, image)
  );
}

export async function fetchLevelExamQuestions(
  examId: number
): Promise<LevelExamQuestion[]> {
  const { data } = await api.get<{ questions: LevelExamQuestion[] }>(
    `${BASE}/level-exams/${examId}/questions`
  );
  return data.questions ?? [];
}

export async function updateLevelExamQuestion(
  questionId: number,
  payload: McqQuestionPayload,
  image?: File | null
): Promise<void> {
  await api.put(
    `${BASE}/level-exam-questions/${questionId}`,
    questionBody(payload, image)
  );
}

export async function updateLevelExamQuestionCorrectOption(
  questionId: number,
  correctOptionId: number
): Promise<void> {
  await api.patch(`${BASE}/level-exam-questions/${questionId}/correct-option`, {
    correct_option_id: correctOptionId,
  });
}

export async function deleteLevelExamQuestion(questionId: number): Promise<void> {
  await api.delete(`${BASE}/level-exam-questions/${questionId}`);
}

export async function importLevelExamQuestionsFromLibrary(
  examId: number,
  payload: { question_ids: number[]; start_position?: number }
): Promise<{ imported_count: number }> {
  const { data } = await api.post<{ imported_count: number }>(
    `${BASE}/level-exams/${examId}/questions/import-from-library`,
    payload
  );
  return data;
}

export async function fetchLevelExamAttempts(
  examId: number
): Promise<LevelExamAttempt[]> {
  const { data } = await api.get<{ attempts: LevelExamAttempt[] }>(
    `${BASE}/level-exams/${examId}/attempts`
  );
  return data.attempts ?? [];
}

export async function createGeneralExam(
  courseId: number,
  payload: {
    title: string;
    is_final: boolean;
    pass_percentage?: number;
    is_active: boolean;
  }
): Promise<CourseGeneralExam> {
  const { data } = await api.post<{ exam: CourseGeneralExam }>(
    `${BASE}/courses/${courseId}/general-exams`,
    payload
  );
  return data.exam;
}

export async function createGeneralExamQuestion(
  examId: number,
  payload: McqQuestionPayload,
  image?: File | null
): Promise<void> {
  await api.post(
    `${BASE}/general-exams/${examId}/questions`,
    questionBody(payload, image)
  );
}

export async function fetchGeneralExamQuestions(
  examId: number
): Promise<LevelExamQuestion[]> {
  const { data } = await api.get<{ questions: LevelExamQuestion[] }>(
    `${BASE}/general-exams/${examId}/questions`
  );
  return data.questions ?? [];
}

export async function updateGeneralExamQuestion(
  questionId: number,
  payload: McqQuestionPayload,
  image?: File | null
): Promise<void> {
  await api.put(
    `${BASE}/general-exam-questions/${questionId}`,
    questionBody(payload, image)
  );
}

export async function deleteGeneralExamQuestion(questionId: number): Promise<void> {
  await api.delete(`${BASE}/general-exam-questions/${questionId}`);
}

export async function importGeneralExamQuestionsFromLibrary(
  examId: number,
  payload: { question_ids: number[]; start_position?: number }
): Promise<{ imported_count: number }> {
  const { data } = await api.post<{ imported_count: number }>(
    `${BASE}/general-exams/${examId}/questions/import-from-library`,
    payload
  );
  return data;
}

export async function fetchGeneralExamAttempts(
  examId: number
): Promise<LevelExamAttempt[]> {
  const { data } = await api.get<{ attempts: LevelExamAttempt[] }>(
    `${BASE}/general-exams/${examId}/attempts`
  );
  return data.attempts ?? [];
}

export async function fetchCourseStudents(
  courseId: number,
  params: { limit?: number; skip?: number } = {}
): Promise<CourseStudentsResponse> {
  const { data } = await api.get<CourseStudentsResponse>(
    `${BASE}/courses/${courseId}/students`,
    {
      params: {
        limit: params.limit ?? 50,
        skip: params.skip ?? 0,
      },
    }
  );
  return data;
}
