'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import api from '@/lib/api';
import { getToken, setSession, type AuthUser } from '@/lib/auth-storage';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** + اختياري ثم 8–15 رقم */
const PHONE_RE = /^\+?\d{8,15}$/;

type LoginMode = 'email' | 'phone';

type FieldErrors = {
  identifier?: string;
  password?: string;
  form?: string;
};

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (getToken()) {
      router.replace('/library');
    }
  }, [router]);

  function validate(): boolean {
    const next: FieldErrors = {};

    if (!password.trim()) {
      next.password = 'كلمة المرور مطلوبة';
    }

    if (mode === 'email') {
      const e = email.trim();
      if (!e) {
        next.identifier = 'أدخل البريد الإلكتروني';
      } else if (!EMAIL_RE.test(e)) {
        next.identifier = 'صيغة البريد غير صالحة';
      }
    } else {
      const p = phone.trim();
      if (!p) {
        next.identifier = 'أدخل رقم الجوال';
      } else if (!PHONE_RE.test(p)) {
        next.identifier =
          'رقم غير صالح: استخدم 8–15 رقمًا مع + في البداية إن لزم';
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setErrors({});
    setPending(true);

    const body =
      mode === 'email'
        ? { email: email.trim(), password }
        : { phone: phone.trim(), password };

    try {
      const { data } = await api.post<{ user: AuthUser; token: string }>(
        '/api/login',
        body
      );
      setSession(data.token, data.user);
      router.replace('/library');
    } catch (err) {
      if (isAxiosError(err)) {
        const msg =
          (err.response?.data as { message?: string })?.message ??
          err.message;
        setErrors({
          form:
            err.response?.status === 400
              ? msg || 'بيانات الدخول غير صحيحة'
              : msg || 'تعذر الاتصال بالخادم',
        });
      } else {
        setErrors({ form: 'حدث خطأ غير متوقع' });
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
      dir="rtl"
    >
      <h1 className="text-center text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        تسجيل الدخول
      </h1>
      <p className="mt-1 text-center text-sm text-zinc-500 dark:text-zinc-400">
        أدخل البريد أو الجوال مع كلمة المرور
      </p>

      <div className="mt-6 flex rounded-lg bg-zinc-100 p-1 dark:bg-zinc-900">
        <button
          type="button"
          onClick={() => {
            setMode('email');
            setErrors({});
          }}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
            mode === 'email'
              ? 'bg-white text-zinc-900 shadow dark:bg-zinc-800 dark:text-zinc-50'
              : 'text-zinc-600 dark:text-zinc-400'
          }`}
        >
          البريد الإلكتروني
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('phone');
            setErrors({});
          }}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
            mode === 'phone'
              ? 'bg-white text-zinc-900 shadow dark:bg-zinc-800 dark:text-zinc-50'
              : 'text-zinc-600 dark:text-zinc-400'
          }`}
        >
          رقم الجوال
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {mode === 'email' ? (
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              البريد الإلكتروني
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none ring-zinc-400 placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              placeholder="user@example.com"
              dir="ltr"
            />
            {errors.identifier && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.identifier}
              </p>
            )}
          </div>
        ) : (
          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              رقم الجوال
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              placeholder="+966501234567"
              dir="ltr"
            />
            {errors.identifier && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {errors.identifier}
              </p>
            )}
          </div>
        )}

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            كلمة المرور
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-zinc-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.password}
            </p>
          )}
        </div>

        {errors.form && (
          <p
            className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
            role="alert"
          >
            {errors.form}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="flex w-full items-center justify-center rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pending ? 'جاري التحقق…' : 'دخول'}
        </button>
      </form>
    </div>
  );
}
