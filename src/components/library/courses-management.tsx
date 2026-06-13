'use client';

import {
  ChevronLeft,
  FileQuestion,
  GraduationCap,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
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
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const filteredCourses = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter(
      (course) =>
        course.title.toLowerCase().includes(q) ||
        (course.description?.toLowerCase().includes(q) ?? false)
    );
  }, [courses, search]);

  const totalLessons = courses.reduce((sum, course) => sum + (course.lesson_count ?? 0), 0);

  async function deleteCourse(course: Course) {
    setDeleting(true);
    setBanner(null);
    try {
      await ql.deleteCourse(course.id);
      await loadCourses();
      setDeleteTarget(null);
    } catch (e) {
      setBanner(apiErr(e));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">
      <section className="relative overflow-hidden rounded-[1.7rem] bg-gradient-to-br from-emerald-600 via-blue-700 to-zinc-950 p-5 text-white shadow-xl shadow-blue-500/20 md:p-7">
        <div className="absolute -start-16 -top-16 h-48 w-48 rounded-full bg-white/10" />
        <div className="absolute -bottom-24 end-12 h-56 w-56 rounded-full bg-orange-400/20" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="text-right">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-black backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-orange-200" />
              Question Library
            </span>
            <h1 className="mt-4 text-3xl font-black tracking-tight md:text-4xl">
              مكتبة الأسئلة
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/85">
              نظّم دورات بنك الأسئلة، افتح الدروس، وأدر الأسئلة والصور والاختيارات من مكان واحد.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModal({ type: 'course', mode: 'create' })}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-blue-700 shadow-lg transition hover:bg-blue-50"
          >
            <Plus className="h-5 w-5" />
            دورة جديدة
          </button>
        </div>
      </section>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <StatCard icon={GraduationCap} label="إجمالي الدورات" value={courses.length} />
        <StatCard icon={FileQuestion} label="إجمالي الدروس" value={totalLessons} />
        <StatCard icon={Search} label="نتائج العرض" value={filteredCourses.length} />
      </div>

      <section className="mt-5 rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <button
            type="button"
            onClick={loadCourses}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-black text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </button>
          <div className="relative min-w-0 flex-1 lg:max-w-xl">
            <Search className="pointer-events-none absolute end-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث باسم الدورة أو الوصف..."
              className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 pe-11 text-right text-sm outline-none transition placeholder:text-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>
        </div>
      </section>

      {banner && (
        <div
          className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-right text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          {banner}
        </div>
      )}

      <div className="mt-6">
        {loading ? (
          <div className="rounded-3xl border border-zinc-200 bg-white py-16 text-center text-zinc-500 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <Loader2 className="mx-auto mb-3 h-7 w-7 animate-spin" />
            جاري تحميل مكتبة الأسئلة...
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
            <GraduationCap className="mx-auto h-12 w-12 text-zinc-400" />
            <p className="mt-4 text-lg font-black text-zinc-900 dark:text-white">
              لا توجد دورات مطابقة
            </p>
            <p className="mt-2 text-sm text-zinc-500">
              جرّب تعديل البحث أو أنشئ دورة جديدة لبدء بناء بنك الأسئلة.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                onEdit={() => setModal({ type: 'course', mode: 'edit', course })}
                onDelete={() => setDeleteTarget(course)}
              />
            ))}
          </div>
        )}
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

      {deleteTarget && (
        <ConfirmDeleteModal
          course={deleteTarget}
          busy={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => deleteCourse(deleteTarget)}
        />
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof GraduationCap;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-5 text-right shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <Icon className="ms-auto h-5 w-5 text-blue-600" />
      <p className="mt-3 text-2xl font-black text-zinc-950 dark:text-white">
        {value.toLocaleString('ar-EG')}
      </p>
      <p className="mt-1 text-xs font-bold text-zinc-500">{label}</p>
    </div>
  );
}

function CourseCard({
  course,
  onEdit,
  onDelete,
}: {
  course: Course;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="group overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
      <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-zinc-950 p-5 text-white">
        <div className="absolute -start-8 -top-10 h-28 w-28 rounded-full bg-white/10" />
        <div className="absolute -bottom-10 end-8 h-24 w-24 rounded-full bg-orange-400/20" />
        <div className="relative flex items-start justify-between gap-3">
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black">
            {course.lesson_count ?? 0} درس
          </span>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/30 bg-white/15">
            <GraduationCap className="h-6 w-6" />
          </div>
        </div>
        <h2 className="relative mt-5 line-clamp-2 text-right text-xl font-black">
          {course.title}
        </h2>
      </div>

      <div className="p-5 text-right">
        <p className="line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-zinc-500">
          {course.description || 'لا يوجد وصف لهذه الدورة بعد.'}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <Link
            href={`/library/courses/${course.id}`}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-700"
          >
            الدروس
            <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
          </Link>
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-black text-blue-700 transition hover:bg-blue-100 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300"
          >
            <Pencil className="h-4 w-4" />
            تعديل
          </button>
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-100 px-4 py-3 text-sm font-black text-red-600 transition hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/30"
        >
          <Trash2 className="h-4 w-4" />
          حذف الدورة
        </button>
      </div>
    </article>
  );
}

function ConfirmDeleteModal({
  course,
  busy,
  onCancel,
  onConfirm,
}: {
  course: Course;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-label="إلغاء"
        onClick={onCancel}
        disabled={busy}
      />
      <div className="relative z-10 w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-5 text-right shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-row-reverse items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400">
            <Trash2 className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-black text-zinc-950 dark:text-white">تأكيد حذف الدورة</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              حذف «{course.title}» سيحذف كل الدروس والأسئلة التابعة لها.
            </p>
          </div>
        </div>
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="inline-flex items-center justify-center rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-black text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            حذف
          </button>
        </div>
      </div>
    </div>
  );
}
