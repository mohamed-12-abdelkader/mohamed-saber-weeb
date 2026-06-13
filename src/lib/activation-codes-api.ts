import api from '@/lib/api';

const BASE = '/api/admin/course-management';

export type ActivationCodeUsedBy = {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
};

export type ActivationCodeRow = {
  id: number;
  code: string;
  status: string;
  created_at: string;
  used_at: string | null;
  used_by: ActivationCodeUsedBy | null;
};

export type CreateActivationCodesResponse = {
  codes: string[];
  count: number;
};

export async function createActivationCodes(
  courseId: number,
  count?: number
): Promise<CreateActivationCodesResponse> {
  const body = count != null && count !== 1 ? { count } : {};
  const { data } = await api.post<CreateActivationCodesResponse>(
    `${BASE}/courses/${courseId}/activation-codes`,
    body
  );
  return data;
}

export async function fetchActivationCodes(
  courseId: number
): Promise<ActivationCodeRow[]> {
  const { data } = await api.get<{ codes: ActivationCodeRow[] }>(
    `${BASE}/courses/${courseId}/activation-codes`
  );
  return data.codes ?? [];
}
