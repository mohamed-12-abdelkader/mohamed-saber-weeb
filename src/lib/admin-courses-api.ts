import api from '@/lib/api';

export type AdminCourseType = 'qdrat' | 'tahseeli';

export type AdminCourse = {
  id: number;
  title: string;
  description: string | null;
  price: number;
  image_url: string | null;
  teacher_id: number | null;
  placement_level_id: number | null;
  placement_level_name: string | null;
  course_type: AdminCourseType;
  created_at: string;
};

export type AdminCoursePayload = {
  title?: string;
  description?: string | null;
  price?: number;
  course_type?: AdminCourseType;
  placement_level_id?: number | null;
  image_url?: string | null;
};

export type AdminPlacementLevel = {
  id: number;
  name: string;
  min_percent: number;
  max_percent: number;
  sort_order: number;
};

const BASE = '/api/admin/courses';

function toFormData(payload: AdminCoursePayload, image: File): FormData {
  const form = new FormData();
  form.append('data', JSON.stringify(payload));
  form.append('image', image);
  return form;
}

export async function fetchAdminCourses(params?: {
  placement_level_id?: number;
  course_type?: AdminCourseType;
}): Promise<AdminCourse[]> {
  const { data } = await api.get<{ courses: AdminCourse[] }>(BASE, { params });
  return data.courses;
}

export async function fetchAdminCourse(courseId: number): Promise<AdminCourse> {
  const { data } = await api.get<{ course: AdminCourse }>(`${BASE}/${courseId}`);
  return data.course;
}

export async function createAdminCourse(
  payload: AdminCoursePayload,
  image?: File | null
): Promise<AdminCourse> {
  const body = image ? toFormData(payload, image) : payload;
  const { data } = await api.post<{ course: AdminCourse }>(BASE, body);
  return data.course;
}

export async function updateAdminCourse(
  courseId: number,
  payload: AdminCoursePayload,
  image?: File | null
): Promise<AdminCourse> {
  const body = image ? toFormData(payload, image) : payload;
  const { data } = await api.patch<{ course: AdminCourse }>(
    `${BASE}/${courseId}`,
    body
  );
  return data.course;
}

export async function deleteAdminCourse(courseId: number): Promise<void> {
  await api.delete(`${BASE}/${courseId}`);
}

export async function fetchPlacementLevels(): Promise<AdminPlacementLevel[]> {
  const { data } = await api.get<{ levels: AdminPlacementLevel[] }>(
    '/api/admin/placement/levels'
  );
  return data.levels ?? [];
}
