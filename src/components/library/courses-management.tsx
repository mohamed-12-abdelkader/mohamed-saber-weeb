'use client';

import {
  ChevronLeft,
  GraduationCap,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiErr } from '@/lib/library-errors';
import * as ql from '@/lib/question-library-api';
import type { Course } from '@/types/question-library';
import {
  CourseModal,
  type ModalState,
} from '@/components/library/library-modals';

export function CoursesManagement() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ type: 'none' });

  async function loadCourses() {
    setBanner(null);
    setLoading(true);
    try {
      const list = await ql.fetchCourses();
      setCourses(list);
    } catch (e) {
      setBanner(apiErr(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const list = await ql.fetchCourses();
        if (!cancelled) setCourses(list);
      } catch (e) {
        if (!cancelled) setBanner(apiErr(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white md:text-3xl">
            الدورات الدراسية
          </h1>
          <p className="mt-2 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
            كل دورة تحتوي دروسًا؛ من صفحة الدورة يمكنك فتح درسًا وإدارة الأسئلة
            في صفحة مخصصة.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModal({ type: 'course', mode: 'create' })}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-700"
        >
          <Plus className="h-5 w-5" />
          دورة جديدة
        </button>
      </div>

      {banner && (
        <div
          className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          {banner}
        </div>
      )}

      <div className="mt-10 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-start">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-950/50">
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  الدورة
                </th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  الوصف
                </th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  الدروس
                </th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  إجراءات
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-zinc-500">
                    جاري التحميل…
                  </td>
                </tr>
              ) : courses.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-zinc-500">
                    لا توجد دورات بعد. أنشئ دورةً لتبدأ.
                  </td>
                </tr>
              ) : (
                courses.map((c) => (
                  <tr
                    key={c.id}
                    className="transition hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                          <GraduationCap className="h-5 w-5" />
                        </div>
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">
                          {c.title}
                        </span>
                      </div>
                    </td>
                    <td className="max-w-xs px-5 py-4">
                      <p className="line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                        {c.description || '—'}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        {c.lesson_count ?? '—'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/library/courses/${c.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        >
                          الدروس
                          <ChevronLeft className="h-3.5 w-3.5 rtl:rotate-180" />
                        </Link>
                        <button
                          type="button"
                          onClick={() =>
                            setModal({ type: 'course', mode: 'edit', course: c })
                          }
                          className="inline-flex items-center gap-1 rounded-lg p-2 text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                          title="تعديل"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              confirm(
                                `حذف «${c.title}»؟ سيُحذف كل الدروس والأسئلة التابعة.`
                              )
                            ) {
                              void (async () => {
                                try {
                                  await ql.deleteCourse(c.id);
                                  await loadCourses();
                                } catch (e) {
                                  setBanner(apiErr(e));
                                }
                              })();
                            }
                          }}
                          className="inline-flex items-center gap-1 rounded-lg p-2 text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                          title="حذف"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal.type === 'course' && (
        <CourseModal
          state={modal}
          onClose={() => setModal({ type: 'none' })}
          onSaved={async () => {
            await loadCourses();
            setModal({ type: 'none' });
          }}
        />
      )}
    </div>
  );
}
