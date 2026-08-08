import { isAxiosError } from 'axios';

export function apiErr(e: unknown): string {
  if (isAxiosError(e)) {
    const msg = (e.response?.data as { message?: string })?.message;
    if (e.response?.status === 401) return 'انتهت الجلسة أو التوكن غير صالح.';
    if (e.response?.status === 403)
      return 'ليس لديك صلاحية (يتطلب دور مسؤول).';
    if (e.response?.status === 413) {
      return (
        msg ||
        'حجم الملفات كبير جداً (413). جرّب ضغط الصور أو تحديد نطاق صفحات أصغر لملف PDF.'
      );
    }
    return msg || e.message || 'خطأ في الطلب';
  }
  if (e instanceof Error && e.message) return e.message;
  return 'حدث خطأ غير متوقع';
}
