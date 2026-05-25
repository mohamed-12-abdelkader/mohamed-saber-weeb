'use client';

import {
  ArrowLeft,
  BookMarked,
  Layers,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiErr } from '@/lib/library-errors';
import * as ql from '@/lib/question-library-api';
import type { Course } from '@/types/question-library';

export function LibraryHome() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const list = await ql.fetchCourses();
        if (!cancelled) setCourses(list);
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

  const totalLessons = courses.reduce(
    (sum, c) => sum + (c.lesson_count ?? 0),
    0
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10">
      <section className="relative overflow-hidden rounded-3xl border border-indigo-100/80 bg-gradient-to-br from-indigo-600 via-violet-700 to-purple-900 p-8 text-white shadow-2xl shadow-indigo-900/20 md:p-10">
        <div className="pointer-events-none absolute -start-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 end-0 h-48 w-48 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            Admin Question Library
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
            مرحبًا بك في مكتبة الأسئلة
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-indigo-100/95">
            أنشئ الدورات والدروس، ثم أضف أسئلة MCQ أو ارفع صورًا بالجملة واضبط
            الخيارات الأربعة والإجابة الصحيحة — وفق مسارات API الموثقة.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/library/courses"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-indigo-700 shadow-lg transition hover:bg-indigo-50"
            >
              إدارة الدورات
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {err && (
        <div
          className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          {err}
        </div>
      )}

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            <BookMarked className="h-5 w-5" />
          </div>
          <p className="mt-4 text-3xl font-bold tabular-nums text-zinc-900 dark:text-white">
            {loading ? '—' : courses.length}
          </p>
          <p className="text-sm font-medium text-zinc-500">دورات نشطة</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <Layers className="h-5 w-5" />
          </div>
          <p className="mt-4 text-3xl font-bold tabular-nums text-zinc-900 dark:text-white">
            {loading ? '—' : totalLessons}
          </p>
          <p className="text-sm font-medium text-zinc-500">إجمالي الدروس</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
            <TrendingUp className="h-5 w-5" />
          </div>
          <p className="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            سير العمل المقترح: دورة ← درس ← إضافة أسئلة ← ضبط الخيارات.
          </p>
        </div>
      </div>

      {!loading && courses.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-white">
            <BookMarked className="h-5 w-5 text-indigo-600" />
            دوراتك الأخيرة
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {courses.slice(0, 4).map((c) => (
              <Link
                key={c.id}
                href={`/library/courses/${c.id}`}
                className="group flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-5 py-4 shadow-sm transition hover:border-indigo-200 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-indigo-900/50"
              >
                <div className="min-w-0">
                  <p className="font-medium text-zinc-900 group-hover:text-indigo-700 dark:text-white dark:group-hover:text-indigo-400">
                    {c.title}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {c.lesson_count ?? 0} درس
                  </p>
                </div>
                <ArrowLeft className="h-5 w-5 shrink-0 text-zinc-400 transition group-hover:text-indigo-600 group-hover:-translate-x-0.5 rtl:rotate-180" />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
