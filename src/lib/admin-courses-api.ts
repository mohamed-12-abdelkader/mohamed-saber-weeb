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
const COURSE_IMAGE_MAX_BYTES = 850 * 1024;
const COURSE_IMAGE_MAX_WIDTH = 1600;
const COURSE_IMAGE_MAX_HEIGHT = 1000;

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
      reject(new Error('Unable to load course image'));
    };
    image.src = url;
  });
}

async function compressCourseImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
    return file;
  }

  if (file.size <= COURSE_IMAGE_MAX_BYTES) {
    return file;
  }

  const image = await loadImage(file);
  let bestBlob: Blob | null = null;
  for (const maxWidth of [COURSE_IMAGE_MAX_WIDTH, 1280, 1024, 800]) {
    const scale = Math.min(
      1,
      maxWidth / image.naturalWidth,
      COURSE_IMAGE_MAX_HEIGHT / image.naturalHeight
    );
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    ctx.drawImage(image, 0, 0, width, height);

    for (const quality of [0.82, 0.72, 0.62, 0.52]) {
      const blob = await canvasToBlob(canvas, 'image/webp', quality);
      if (!blob) continue;
      if (!bestBlob || blob.size < bestBlob.size) bestBlob = blob;
      if (blob.size <= COURSE_IMAGE_MAX_BYTES) break;
    }

    if (bestBlob && bestBlob.size <= COURSE_IMAGE_MAX_BYTES) break;
  }

  if (!bestBlob || bestBlob.size >= file.size) {
    return file;
  }

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'course-image';
  return new File([bestBlob], `${baseName}.webp`, { type: 'image/webp' });
}

async function toFormData(payload: AdminCoursePayload, image: File): Promise<FormData> {
  const form = new FormData();
  const compressedImage = await compressCourseImage(image);
  form.append('data', JSON.stringify(payload));
  form.append('image', compressedImage);
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
  const body = image ? await toFormData(payload, image) : payload;
  const { data } = await api.post<{ course: AdminCourse }>(BASE, body);
  return data.course;
}

export async function updateAdminCourse(
  courseId: number,
  payload: AdminCoursePayload,
  image?: File | null
): Promise<AdminCourse> {
  const body = image ? await toFormData(payload, image) : payload;
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
