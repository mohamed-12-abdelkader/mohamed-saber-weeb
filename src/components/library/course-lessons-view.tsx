'use client';

import {
  BookOpen,
  ChevronRight,
  ClipboardList,
  ListOrdered,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiErr } from '@/lib/library-errors';
import * as ql from '@/lib/question-library-api';
import type { Course, Lesson } from '@/types/question-library';
import {
  LessonModal,
  type ModalState,
} from '@/components/library/library-modals';

export function CourseLessonsView() {
  const params = useParams();
  const router = useRouter();
  const courseId = Number(params.courseId);

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ type: 'none' });

  async function loadAll() {
    if (!Number.isFinite(courseId)) {
      setBanner('معرّف الدورة غير صالح');
      setLoading(false);
      return;
    }
    setBanner(null);
    setLoading(true);
    try {
      const courses = await ql.fetchCourses();
      const found = courses.find((c) => c.id === courseId) ?? null;
      setCourse(found);
      if (!found) {
        setBanner('الدورة غير موجودة');
        setLessons([]);
        return;
      }
      const list = await ql.fetchLessons(courseId);
      setLessons(list);
    } catch (e) {
      setBanner(apiErr(e));
      setLessons([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!Number.isFinite(courseId)) {
        if (!cancelled) {
          setBanner('معرّف الدورة غير صالح');
          setLoading(false);
        }
        return;
      }
      try {
        const courses = await ql.fetchCourses();
        const found = courses.find((c) => c.id === courseId) ?? null;
        if (cancelled) return;
        setCourse(found);
        if (!found) {
          setBanner('الدورة غير موجودة');
          setLessons([]);
          return;
        }
        const list = await ql.fetchLessons(courseId);
        if (!cancelled) setLessons(list);
      } catch (e) {
        if (!cancelled) {
          setBanner(apiErr(e));
          setLessons([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  if (!Number.isFinite(courseId)) {
    return null;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10">
      <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
        <Link
          href="/library"
          className="hover:text-indigo-600 dark:hover:text-indigo-400"
        >
          لوحة التحكم
        </Link>
        <ChevronRight className="h-4 w-4 opacity-60" />
        <Link
          href="/library/courses"
          className="hover:text-indigo-600 dark:hover:text-indigo-400"
        >
          الدورات
        </Link>
        <ChevronRight className="h-4 w-4 opacity-60" />
        <span className="font-medium text-zinc-800 dark:text-zinc-200">
          {course?.title ?? '…'}
        </span>
      </nav>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white md:text-3xl">
            {loading ? '…' : course?.title ?? 'دورة'}
          </h1>
          {course?.description && (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {course.description}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => router.push('/library/courses')}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
          >
            كل الدورات
          </button>
          <button
            type="button"
            onClick={() => setModal({ type: 'lesson', mode: 'create' })}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-indigo-700"
          >
            <Plus className="h-5 w-5" />
            درس جديد
          </button>
        </div>
      </div>

      {banner && (
        <div
          className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          {banner}
        </div>
      )}

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <p className="col-span-full py-12 text-center text-zinc-500">
            جاري التحميل…
          </p>
        ) : lessons.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/50 px-6 py-14 text-center dark:border-zinc-700 dark:bg-zinc-900/30">
            <BookOpen className="mx-auto h-12 w-12 text-zinc-400" />
            <p className="mt-4 font-medium text-zinc-700 dark:text-zinc-300">
              لا توجد دروس بعد
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              أضف درسًا ثم انتقل لصفحة الأسئلة لإضافة محتوى MCQ أو صور.
            </p>
          </div>
        ) : (
          lessons.map((l) => (
            <article
              key={l.id}
              className="group flex flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-indigo-900/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-semibold text-zinc-900 dark:text-white">
                      {l.title}
                    </h2>
                    <p className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                      <ListOrdered className="h-3.5 w-3.5" />
                      ترتيب {l.position}
                      <span className="text-zinc-300">·</span>
                      {l.question_count ?? 0} أسئلة
                    </p>
                  </div>
                </div>
              </div>
              {l.description && (
                <p className="mt-3 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {l.description}
                </p>
              )}
              <div className="mt-5 flex flex-1 flex-wrap items-end gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                <Link
                  href={`/library/lessons/${l.id}/questions?courseId=${courseId}`}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
                >
                  الأسئلة
                  <ChevronRight className="h-4 w-4" />
                </Link>
                <button
                  type="button"
                  onClick={() =>
                    setModal({ type: 'lesson', mode: 'edit', lesson: l })
                  }
                  className="rounded-xl border border-zinc-200 p-2.5 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  title="تعديل"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`حذف الدرس «${l.title}»؟`)) {
                      void (async () => {
                        try {
                          await ql.deleteLesson(l.id);
                          await loadAll();
                        } catch (e) {
                          setBanner(apiErr(e));
                        }
                      })();
                    }
                  }}
                  className="rounded-xl border border-red-100 p-2.5 text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-950/40"
                  title="حذف"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      {modal.type === 'lesson' && (
        <LessonModal
          courseId={courseId}
          state={modal}
          onClose={() => setModal({ type: 'none' })}
          onSaved={async () => {
            await loadAll();
            setModal({ type: 'none' });
          }}
        />
      )}
    </div>
  );
}
