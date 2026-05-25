import { isAxiosError } from 'axios';

export function apiErr(e: unknown): string {
  if (isAxiosError(e)) {
    const msg = (e.response?.data as { message?: string })?.message;
    if (e.response?.status === 401) return 'انتهت الجلسة أو التوكن غير صالح.';
    if (e.response?.status === 403)
      return 'ليس لديك صلاحية (يتطلب دور مسؤول).';
    return msg || e.message || 'خطأ في الطلب';
  }
  return 'حدث خطأ غير متوقع';
}
