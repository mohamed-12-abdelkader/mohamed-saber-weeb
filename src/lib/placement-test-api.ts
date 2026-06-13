import api from '@/lib/api';

const BASE = '/api/admin/placement';

export type PlacementLevel = {
  id: number;
  name: string;
  min_percent: number;
  max_percent: number;
  sort_order: number;
  created_at?: string;
};

export type PlacementLevelPayload = {
  name: string;
  min_percent: number;
  max_percent: number;
  sort_order?: number;
};

export type PlacementTest = {
  id: number;
  title: string;
  description: string | null;
  is_active: boolean;
  max_attempts: number;
  questions_per_attempt: number;
  duration_minutes: number;
  created_at?: string;
  updated_at?: string;
  max_score?: string | number;
  question_count?: number;
};

export type PlacementTestPayload = {
  title: string;
  description?: string | null;
  is_active?: boolean;
  max_attempts?: number;
  questions_per_attempt?: number;
  duration_minutes?: number;
};

export type PlacementChoicePayload = {
  text: string;
  is_correct: boolean;
  position?: number;
};

export type PlacementQuestionPayload = {
  text: string;
  points: number;
  position?: number;
  image_url?: string | null;
  image_blob?: string | null;
  image_mime_type?: string | null;
  choices: PlacementChoicePayload[];
};

export type PlacementChoice = {
  id: number;
  question_id: number;
  text: string;
  is_correct: boolean;
  position: number;
};

export type PlacementQuestion = {
  id: number;
  test_id: number;
  text: string;
  points: number;
  position: number;
  image_url: string | null;
  image_blob?: string | null;
  image_mime_type?: string | null;
  choices: PlacementChoice[];
};

export type PlacementAttempt = {
  attempt_id: number;
  score: number;
  max_score: number;
  percentage: number;
  completed_at: string;
  student: {
    id: number;
    name: string;
    email: string;
    phone?: string | null;
  };
  test: {
    id: number;
    title: string;
  };
  placement_level: {
    id: number;
    name: string;
    min_percent?: number;
    max_percent?: number;
  } | null;
};

export type PlacementAttemptDetail = PlacementAttempt & {
  mistakes: {
    question_id: number;
    question_text: string;
    question_image_url: string | null;
    question_image_blob?: string | null;
    question_image_mime_type?: string | null;
    points: number;
    your_choice: { id: number; text: string } | null;
    correct_answer: { id: number; text: string } | null;
  }[];
  mistakes_count: number;
};

function questionBody(payload: PlacementQuestionPayload, image?: File | null) {
  if (!image) return payload;
  const form = new FormData();
  form.append('data', JSON.stringify(payload));
  form.append('image', image);
  return form;
}

export async function fetchPlacementLevelsAdmin(): Promise<PlacementLevel[]> {
  const { data } = await api.get<{ levels: PlacementLevel[] }>(`${BASE}/levels`);
  return data.levels ?? [];
}

export async function createPlacementLevel(
  payload: PlacementLevelPayload
): Promise<PlacementLevel> {
  const { data } = await api.post<{ level: PlacementLevel }>(`${BASE}/levels`, payload);
  return data.level;
}

export async function updatePlacementLevel(
  id: number,
  payload: PlacementLevelPayload
): Promise<PlacementLevel> {
  const { data } = await api.patch<{ level: PlacementLevel }>(
    `${BASE}/levels/${id}`,
    payload
  );
  return data.level;
}

export async function deletePlacementLevel(id: number): Promise<void> {
  await api.delete(`${BASE}/levels/${id}`);
}

export async function fetchPlacementTests(): Promise<PlacementTest[]> {
  const { data } = await api.get<{ tests: PlacementTest[] }>(`${BASE}/tests`);
  return data.tests ?? [];
}

export async function createPlacementTest(
  payload: PlacementTestPayload
): Promise<PlacementTest> {
  const { data } = await api.post<{ test: PlacementTest }>(`${BASE}/tests`, payload);
  return data.test;
}

export async function updatePlacementTest(
  id: number,
  payload: PlacementTestPayload
): Promise<PlacementTest> {
  const { data } = await api.patch<{ test: PlacementTest }>(
    `${BASE}/tests/${id}`,
    payload
  );
  return data.test;
}

export async function deletePlacementTest(id: number): Promise<void> {
  await api.delete(`${BASE}/tests/${id}`);
}

export async function fetchPlacementQuestions(testId: number): Promise<PlacementQuestion[]> {
  const { data } = await api.get<{ questions: PlacementQuestion[] }>(
    `${BASE}/tests/${testId}/questions`
  );
  return data.questions ?? [];
}

export async function createPlacementQuestion(
  testId: number,
  payload: PlacementQuestionPayload,
  image?: File | null
): Promise<PlacementQuestion> {
  const { data } = await api.post<{ question: PlacementQuestion }>(
    `${BASE}/tests/${testId}/questions`,
    questionBody(payload, image)
  );
  return data.question;
}

export async function updatePlacementQuestion(
  questionId: number,
  payload: PlacementQuestionPayload,
  image?: File | null
): Promise<PlacementQuestion> {
  const { data } = await api.put<{ question: PlacementQuestion }>(
    `${BASE}/questions/${questionId}`,
    questionBody(payload, image)
  );
  return data.question;
}

export async function deletePlacementQuestion(questionId: number): Promise<void> {
  await api.delete(`${BASE}/questions/${questionId}`);
}

export async function importPlacementQuestionsFromLibrary(
  testId: number,
  payload: { question_ids: number[]; points_per_question?: number; start_position?: number }
): Promise<{ imported_count: number; points_per_question?: number }> {
  const { data } = await api.post<{ imported_count: number; points_per_question?: number }>(
    `${BASE}/tests/${testId}/questions/import-from-library`,
    payload
  );
  return data;
}

export async function fetchPlacementAttempts(params?: {
  test_id?: number;
  limit?: number;
  skip?: number;
}): Promise<PlacementAttempt[]> {
  const { data } = await api.get<{ attempts: PlacementAttempt[] }>(`${BASE}/attempts`, {
    params: {
      limit: params?.limit ?? 50,
      skip: params?.skip ?? 0,
      ...(params?.test_id ? { test_id: params.test_id } : {}),
    },
  });
  return data.attempts ?? [];
}

export async function fetchPlacementAttemptDetail(
  attemptId: number
): Promise<PlacementAttemptDetail> {
  const { data } = await api.get<PlacementAttemptDetail>(`${BASE}/attempts/${attemptId}`);
  return data;
}
