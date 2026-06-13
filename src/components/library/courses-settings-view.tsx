'use client';

import {
  CheckCircle2,
  CreditCard,
  Gift,
  KeyRound,
  Loader2,
  Mail,
  Settings2,
  Shield,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import * as cs from '@/lib/courses-settings-api';
import { getUser, setSession, type AuthUser } from '@/lib/auth-storage';
import { apiErr } from '@/lib/library-errors';
import type { CoursesAccessMode } from '@/types/courses-settings';

const MODES: {
  value: CoursesAccessMode;
  label: string;
  description: string;
  icon: typeof Gift;
  accent: string;
}[] = [
  {
    value: 'free',
    label: 'مجاني (free)',
    description:
      'كل الكورسات تظهر للطالب مشتركًا وغير مقفلة. عند فتح القائمة يُسجَّل تلقائيًا في كل كورس ظاهر (اشتراك + تقدم + مجموعة الشات). المحتوى والامتحانات والبث بدون كود تفعيل.',
    icon: Gift,
    accent:
      'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40',
  },
  {
    value: 'paid',
    label: 'مدفوع (paid)',
    description:
      'السلوك الافتراضي: يحتاج الطالب كود تفعيل عبر POST /api/student/courses/activate قبل الوصول للمحتوى.',
    icon: CreditCard,
    accent:
      'border-indigo-300 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950/40',
  },
];

export function CoursesSettingsView() {
  const [currentMode, setCurrentMode] = useState<CoursesAccessMode | null>(
    null
  );
  const [selectedMode, setSelectedMode] = useState<CoursesAccessMode | null>(
    null
  );
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [updatedByAdminId, setUpdatedByAdminId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [adminEmail, setAdminEmail] = useState(() => getUser()?.email ?? '');
  const [currentAdminEmail, setCurrentAdminEmail] = useState(() => getUser()?.email ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [credentialsSaving, setCredentialsSaving] = useState(false);
  const [credentialsErr, setCredentialsErr] = useState<string | null>(null);
  const [credentialsSuccess, setCredentialsSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await cs.fetchCoursesAccessMode();
        if (cancelled) return;
        setCurrentMode(data.courses_access_mode);
        setSelectedMode(data.courses_access_mode);
        setUpdatedAt(data.updated_at ?? null);
        setUpdatedByAdminId(data.updated_by_admin_id ?? null);
      } catch (e) {
        if (!cancelled) setErr(apiErr(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasChanges =
    currentMode != null &&
    selectedMode != null &&
    currentMode !== selectedMode;

  async function handleSave() {
    if (!selectedMode || !hasChanges) return;
    setErr(null);
    setSuccess(null);
    setSaving(true);
    try {
      const data = await cs.updateCoursesAccessMode(selectedMode);
      setCurrentMode(data.courses_access_mode);
      setSelectedMode(data.courses_access_mode);
      setUpdatedAt(data.updated_at ?? null);
      setUpdatedByAdminId(data.updated_by_admin_id ?? null);
      setSuccess('تم تحديث وضع الوصول للكورسات بنجاح.');
    } catch (e) {
      setErr(apiErr(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleCredentialsSave(e: React.FormEvent) {
    e.preventDefault();
    setCredentialsErr(null);
    setCredentialsSuccess(null);

    const nextEmail = adminEmail.trim();
    const nextPassword = newPassword.trim();
    const emailChanged = nextEmail !== currentAdminEmail;

    if (!currentPassword) {
      setCredentialsErr('اكتب الباسورد الحالي أولًا.');
      return;
    }

    if (!emailChanged && !nextPassword) {
      setCredentialsErr('اكتب إيميل جديد أو باسورد جديد للحفظ.');
      return;
    }

    if (nextPassword && nextPassword !== confirmNewPassword) {
      setCredentialsErr('تأكيد الباسورد الجديد غير مطابق.');
      return;
    }

    setCredentialsSaving(true);
    try {
      const data = await cs.updateAdminCredentials({
        current_password: currentPassword,
        ...(emailChanged ? { email: nextEmail } : {}),
        ...(nextPassword ? { new_password: nextPassword } : {}),
      });
      const user: AuthUser = {
        ...data.user,
        phone: data.user.phone ?? '',
      };
      setSession(data.token, user);
      setAdminEmail(data.user.email);
      setCurrentAdminEmail(data.user.email);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setCredentialsSuccess('تم تحديث بيانات الأدمن بنجاح.');
    } catch (e) {
      setCredentialsErr(apiErr(e));
    } finally {
      setCredentialsSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-6 md:py-10">
      <div className="mb-8 flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-lg">
          <Settings2 className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white md:text-3xl">
            إعدادات الكورسات
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            عرض وتغيير وضع الوصول للكورسات (مدفوع / مجاني) للطلاب.
          </p>
        </div>
      </div>

      {err && (
        <div
          className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          {err}
        </div>
      )}
      {success && (
        <div
          className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100"
          role="status"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-zinc-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          جاري تحميل الإعدادات…
        </div>
      ) : (
        <div className="space-y-6">
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-start gap-3 text-right">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                  تغيير بيانات الأدمن
                </h2>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  يستخدم المسار{' '}
                  <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">
                    PATCH /api/user/admin/me/credentials
                  </code>
                </p>
              </div>
            </div>

            {credentialsErr && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
                {credentialsErr}
              </div>
            )}
            {credentialsSuccess && (
              <div className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                {credentialsSuccess}
              </div>
            )}

            <form onSubmit={handleCredentialsSave} className="mt-5 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-right">
                  <span className="text-xs font-bold text-zinc-500">الإيميل الجديد</span>
                  <div className="mt-2 flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 dark:border-zinc-700 dark:bg-zinc-950">
                    <Mail className="h-4 w-4 text-zinc-400" />
                    <input
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      className="min-w-0 flex-1 bg-transparent text-right text-sm text-zinc-900 outline-none dark:text-white"
                      placeholder="new-admin@example.com"
                      dir="ltr"
                    />
                  </div>
                </label>

                <label className="block text-right">
                  <span className="text-xs font-bold text-zinc-500">الباسورد الحالي</span>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-right text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                    placeholder="oldPassword123"
                  />
                </label>

                <label className="block text-right">
                  <span className="text-xs font-bold text-zinc-500">الباسورد الجديد</span>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-right text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                    placeholder="newPassword123"
                  />
                </label>

                <label className="block text-right">
                  <span className="text-xs font-bold text-zinc-500">تأكيد الباسورد الجديد</span>
                  <input
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-right text-sm text-zinc-900 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                    placeholder="newPassword123"
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={credentialsSaving}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-8"
              >
                {credentialsSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جاري تحديث بيانات الأدمن…
                  </>
                ) : (
                  'تحديث بيانات الأدمن'
                )}
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              <Shield className="h-4 w-4 text-indigo-600" />
              الإعداد الحالي
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${
                  currentMode === 'free'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                    : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200'
                }`}
              >
                {currentMode === 'free' ? (
                  <Gift className="h-4 w-4" />
                ) : (
                  <CreditCard className="h-4 w-4" />
                )}
                {currentMode === 'free' ? 'مجاني' : 'مدفوع'}
                <code className="rounded bg-black/10 px-1.5 py-0.5 text-xs font-mono dark:bg-white/10">
                  {currentMode}
                </code>
              </span>
            </div>
            {(updatedAt || updatedByAdminId != null) && (
              <dl className="mt-4 grid gap-2 text-sm text-zinc-600 dark:text-zinc-400 sm:grid-cols-2">
                {updatedAt && (
                  <div>
                    <dt className="text-xs text-zinc-500">آخر تحديث</dt>
                    <dd className="mt-0.5 font-medium text-zinc-800 dark:text-zinc-200">
                      {new Date(updatedAt).toLocaleString('ar-EG', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </dd>
                  </div>
                )}
                {updatedByAdminId != null && (
                  <div>
                    <dt className="text-xs text-zinc-500">بواسطة الأدمن</dt>
                    <dd className="mt-0.5 font-medium text-zinc-800 dark:text-zinc-200">
                      #{updatedByAdminId}
                    </dd>
                  </div>
                )}
              </dl>
            )}
            <p className="mt-4 rounded-lg bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-500 dark:bg-zinc-950">
              GET /api/admin/courses/settings/access-mode
            </p>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
              تغيير الوضع
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              PATCH مع{' '}
              <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">
                courses_access_mode
              </code>{' '}
              — القيم: <strong>paid</strong> (افتراضي) أو <strong>free</strong>.
            </p>

            <div className="mt-6 grid gap-4">
              {MODES.map(({ value, label, description, icon: Icon, accent }) => {
                const selected = selectedMode === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setSelectedMode(value);
                      setSuccess(null);
                    }}
                    disabled={saving}
                    className={`rounded-2xl border-2 p-5 text-start transition ${
                      selected
                        ? `${accent} border-current ring-2 ring-indigo-500/30`
                        : 'border-zinc-200 bg-zinc-50/50 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900/50 dark:hover:border-zinc-600'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                          value === 'free'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-indigo-600 text-white'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-zinc-900 dark:text-white">
                          {label}
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                          {description}
                        </p>
                      </div>
                      {selected && (
                        <CheckCircle2 className="h-6 w-6 shrink-0 text-indigo-600 dark:text-indigo-400" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={!hasChanges || saving}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-8"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري الحفظ…
                </>
              ) : (
                'حفظ التغيير'
              )}
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
