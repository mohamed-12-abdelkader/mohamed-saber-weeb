import api from '@/lib/api';
import type {
  CoursesAccessMode,
  CoursesAccessModeSettings,
} from '@/types/courses-settings';

const BASE = '/api/admin/courses/settings/access-mode';

export async function fetchCoursesAccessMode(): Promise<CoursesAccessModeSettings> {
  const { data } = await api.get<CoursesAccessModeSettings>(BASE);
  return data;
}

export async function updateCoursesAccessMode(
  courses_access_mode: CoursesAccessMode
): Promise<CoursesAccessModeSettings> {
  const { data } = await api.patch<CoursesAccessModeSettings>(BASE, {
    courses_access_mode,
  });
  return data;
}
