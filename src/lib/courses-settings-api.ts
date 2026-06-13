import api from '@/lib/api';
import type {
  CoursesAccessMode,
  CoursesAccessModeSettings,
} from '@/types/courses-settings';

const BASE = '/api/admin/courses/settings/access-mode';

export type AdminCredentialsPayload = {
  current_password: string;
  email?: string;
  new_password?: string;
};

export type AdminCredentialsResponse = {
  message: string;
  user: {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    role: string;
  };
  token: string;
};

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

export async function updateAdminCredentials(
  payload: AdminCredentialsPayload
): Promise<AdminCredentialsResponse> {
  const { data } = await api.patch<AdminCredentialsResponse>(
    '/api/user/admin/me/credentials',
    payload
  );
  return data;
}
