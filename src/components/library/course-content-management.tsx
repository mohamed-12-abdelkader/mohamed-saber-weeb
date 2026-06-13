'use client';

import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  FileQuestion,
  ImageIcon,
  KeyRound,
  Layers,
  Loader2,
  Pencil,
  Plus,
  Power,
  Radio,
  Trash2,
  Users,
  Video,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ActivationCodesManagement } from '@/components/library/activation-codes-management';
import { CourseLiveStreamsPanel } from '@/components/library/course-live-streams-panel';
import { fetchAdminCourse, type AdminCourse } from '@/lib/admin-courses-api';
import {
  createCourseLevel,
  createGeneralExam,
  createLevelExam,
  createLevelLesson,
  deleteCourseLevel,
  deleteLevelExam,
  deleteLevelLesson,
  fetchCourseDetails,
  fetchCourseStudents,
  updateCourseLevel,
  updateLevelExam,
  updateLevelExamStatus,
  updateLevelLesson,
  type CourseGeneralExam,
  type CourseLevel,
  type CourseLevelExam,
  type CourseLesson,
  type CourseLessonFilePayload,
  type CourseStudent,
} from '@/lib/course-management-api';
import { apiErr } from '@/lib/library-errors';

function asOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function asNullableNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function getEmbeddableVideoUrl(videoUrl: string): string {
  const trimmed = videoUrl.trim();
  if (!trimmed) return trimmed;

  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^www\./, '');

    if (host === 'drive.google.com') {
      const fileMatch = url.pathname.match(/\/file\/d\/([^/]+)/);
      const fileId = fileMatch?.[1] ?? url.searchParams.get('id');

      if (fileId) {
        return `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/preview`;
      }
    }
  } catch {
    return trimmed;
  }

  return trimmed;
}

export function CourseContentManagement() {
  const params = useParams();
  const courseId = Number(params.courseId);
  const [course, setCourse] = useState<AdminCourse | null>(null);
  const [levels, setLevels] = useState<CourseLevel[]>([]);
  const [generalExams, setGeneralExams] = useState<CourseGeneralExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'content' | 'exams' | 'live' | 'codes' | 'students'>('content');
  const [levelExpanded, setLevelExpanded] = useState<Record<number, boolean>>({});

  async function load() {
    if (!Number.isFinite(courseId)) return;
    setLoading(true);
    setBanner(null);
    try {
      const [courseInfo, details] = await Promise.all([
        fetchAdminCourse(courseId),
        fetchCourseDetails(courseId).catch(() => null),
      ]);
      setCourse(details?.course ?? courseInfo);
      setLevels(details?.levels ?? []);
      setGeneralExams(details?.general_exams ?? []);
    } catch (e) {
      setBanner(apiErr(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!Number.isFinite(courseId)) {
        setBanner('معرّف الكورس غير صالح');
        setLoading(false);
        return;
      }
      try {
        const [courseInfo, details] = await Promise.all([
          fetchAdminCourse(courseId),
          fetchCourseDetails(courseId).catch(() => null),
        ]);
        if (cancelled) return;
        setCourse(details?.course ?? courseInfo);
        setLevels(details?.levels ?? []);
        setGeneralExams(details?.general_exams ?? []);
      } catch (e) {
        if (!cancelled) setBanner(apiErr(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  const lessonsCount = levels.reduce(
    (sum, level) => sum + (level.lessons?.length ?? 0),
    0
  );
  const levelExamCount = levels.filter((level) => level.level_exam).length;
  const displayTitle = course?.title ?? 'الكورس';
  const displayDesc =
    course?.description?.trim() || 'إدارة المستويات والدروس والاختبارات لهذا الكورس.';
  const courseImageUrl = course?.image_url?.trim();
  const placementLevelLabel =
    course?.placement_level_name?.trim() ||
    (course?.placement_level_id ? `مستوى #${course.placement_level_id}` : null);

  function toggleLevelExpanded(id: number) {
    setLevelExpanded((prev) => ({ ...prev, [id]: prev[id] !== true }));
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8">
      <section className="relative overflow-hidden rounded-[1.4rem] border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="absolute inset-y-0 end-0 w-1.5 bg-blue-500" />
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1 text-right">
            <div className="flex flex-row-reverse items-start gap-3">
              <Link
                href="/library"
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-zinc-200 text-blue-500 transition hover:bg-blue-50 dark:border-zinc-700 dark:hover:bg-blue-950/30"
                aria-label="رجوع"
              >
                <ArrowRight className="h-5 w-5" />
              </Link>
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-black leading-9 text-zinc-950 dark:text-white">
                  {displayTitle}
                </h1>
                {placementLevelLabel && <CourseLevelBadge levelName={placementLevelLabel} />}
              </div>
            </div>

            <p className="mt-4 text-sm leading-7 text-zinc-500">{displayDesc}</p>

            {course && (
              <p className="mt-2 text-sm font-bold text-zinc-500">
                {course.price} ر.س ·{' '}
                {new Date(course.created_at).toLocaleDateString('ar-EG', {
                  dateStyle: 'medium',
                })}
              </p>
            )}

            <p className="mt-3 text-sm font-black text-zinc-800 dark:text-zinc-100">
              {levels.length} مستوى · {lessonsCount} درس · {levelExamCount + generalExams.length} اختبار
            </p>
          </div>

          <div className="h-48 overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-100 lg:w-80 dark:border-zinc-800 dark:bg-zinc-950">
            {courseImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={courseImageUrl} alt={displayTitle} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-zinc-400">
                <ImageIcon className="h-10 w-10 text-blue-500" />
                <p className="mt-2 text-sm font-bold">بدون صورة</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="mt-5 overflow-x-auto border-b border-zinc-200 pb-3 dark:border-zinc-800">
        <div className="flex min-w-max gap-2">
          {[
            { key: 'content' as const, label: 'المحتوى', icon: Layers },
            { key: 'exams' as const, label: 'الاختبارات', icon: ClipboardList },
            { key: 'live' as const, label: 'حصص مباشرة', icon: Radio },
            { key: 'codes' as const, label: 'أكواد التفعيل', icon: KeyRound },
            { key: 'students' as const, label: 'الطلاب', icon: Users },
          ].map(({ key, label, icon: Icon }) => {
            const active = activeTab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-black transition ${
                  active
                    ? 'border-orange-500 bg-orange-500 text-white'
                    : 'border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {banner && (
        <div
          className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          {banner}
        </div>
      )}

      {loading ? (
        <div className="mt-6 rounded-3xl border border-zinc-200 bg-white py-16 text-center text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
          <Loader2 className="mx-auto mb-3 h-7 w-7 animate-spin" />
          جاري تحميل محتوى الكورس...
        </div>
      ) : activeTab === 'content' ? (
        <div className="mt-6 space-y-5">
          <CreateLevelPanel
            courseId={courseId}
            onCreated={async () => {
              await load();
            }}
            onError={setBanner}
          />

          {levels.length === 0 ? (
            <EmptyState text="لا توجد مستويات بعد. اضغط «إضافة مستوى جديد» لبدء بناء هيكل الكورس." />
          ) : (
            levels
              .slice()
              .sort((a, b) => a.position - b.position)
              .map((level, idx) => (
                <LevelCard
                  key={level.id}
                  level={level}
                  index={idx}
                  expanded={levelExpanded[level.id] === true}
                  onToggle={() => toggleLevelExpanded(level.id)}
                  onChanged={load}
                  onError={setBanner}
                />
              ))
          )}
        </div>
      ) : activeTab === 'exams' ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_24rem]">
          <GeneralExamsPanel
            exams={generalExams}
            courseTitle={displayTitle}
          />

          <aside>
            <CreateGeneralExamPanel
              courseId={courseId}
              onCreated={load}
              onError={setBanner}
            />
          </aside>
        </div>
      ) : activeTab === 'codes' ? (
        <ActivationCodesManagement initialCourseId={courseId} compact />
      ) : activeTab === 'students' ? (
        <CourseStudentsPanel courseId={courseId} />
      ) : activeTab === 'live' ? (
        <CourseLiveStreamsPanel courseId={courseId} />
      ) : (
        <div className="mt-6 rounded-3xl border border-dashed border-zinc-300 bg-white py-16 text-center dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-lg font-black text-zinc-900 dark:text-white">
            هذا التبويب غير مفعّل في نسخة الويب الحالية
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            تم تجهيز التصميم مثل التطبيق، ويمكن ربطه لاحقًا بـ API الخاص به.
          </p>
        </div>
      )}

    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  hint,
}: {
  icon: typeof BookOpen;
  title: string;
  hint: string;
}) {
  return (
    <div className="flex flex-row-reverse items-start gap-3 text-right">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <h2 className="text-xl font-black text-zinc-950 dark:text-white">{title}</h2>
        <p className="mt-1 text-sm text-zinc-500">{hint}</p>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-zinc-300 bg-white py-12 text-center text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
      {text}
    </div>
  );
}

function CourseLevelBadge({ levelName }: { levelName: string }) {
  return (
    <div className="mt-3 inline-flex overflow-hidden rounded-2xl border border-orange-200 bg-orange-50 text-right shadow-sm shadow-orange-500/10 dark:border-orange-900/50 dark:bg-orange-950/20">
      <span className="flex items-center justify-center bg-orange-500 px-3 text-white">
        <Layers className="h-4 w-4" />
      </span>
      <span className="px-4 py-2">
        <span className="block text-[11px] font-black uppercase tracking-wide text-orange-500">
          مستوى الكورس
        </span>
        <span className="block text-sm font-black text-zinc-950 dark:text-white">{levelName}</span>
      </span>
    </div>
  );
}

function CourseStudentsPanel({ courseId }: { courseId: number }) {
  const [students, setStudents] = useState<CourseStudent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadStudents() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCourseStudents(courseId, { limit: 50, skip: 0 });
      setStudents(data.students ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      setError(apiErr(e));
      setStudents([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetchCourseStudents(courseId, { limit: 50, skip: 0 })
      .then((data) => {
        if (cancelled) return;
        setStudents(data.students ?? []);
        setTotal(data.total ?? 0);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(apiErr(e));
        setStudents([]);
        setTotal(0);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [courseId]);

  return (
    <section className="mt-6 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <button
          type="button"
          onClick={loadStudents}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-black text-blue-700 transition hover:bg-blue-100 disabled:opacity-60 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          تحديث
        </button>
        <SectionTitle
          icon={Users}
          title="طلاب الكورس"
          hint="عرض الطلاب المشتركين في هذا الكورس من لوحة الإدارة."
        />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <StudentStat label="إجمالي الطلاب" value={total} />
        <StudentStat label="المعروض الآن" value={students.length} />
        <StudentStat label="حد الصفحة" value={50} />
      </div>

      {error && (
        <div
          className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-right text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-5 rounded-3xl border border-dashed border-zinc-300 py-12 text-center text-zinc-500 dark:border-zinc-700">
          <Loader2 className="mx-auto mb-3 h-7 w-7 animate-spin" />
          جاري تحميل الطلاب...
        </div>
      ) : error ? null : students.length === 0 ? (
        <p className="mt-5 rounded-3xl border border-dashed border-zinc-300 py-12 text-center text-sm text-zinc-500 dark:border-zinc-700">
          لا يوجد طلاب مشتركين في هذا الكورس حتى الآن.
        </p>
      ) : (
        <div className="mt-5 overflow-hidden rounded-3xl border border-zinc-200 dark:border-zinc-800">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-right text-sm">
              <thead className="bg-zinc-50 text-xs font-black text-zinc-500 dark:bg-zinc-950">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">الطالب</th>
                  <th className="px-4 py-3">البريد الإلكتروني</th>
                  <th className="px-4 py-3">رقم الهاتف</th>
                  <th className="px-4 py-3">تاريخ الاشتراك</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {students.map((student) => (
                  <tr
                    key={student.id}
                    className="bg-white transition hover:bg-blue-50/40 dark:bg-zinc-900 dark:hover:bg-blue-950/20"
                  >
                    <td className="px-4 py-4 font-black text-blue-600">#{student.id}</td>
                    <td className="px-4 py-4">
                      <p className="font-black text-zinc-950 dark:text-white">
                        {student.name || 'بدون اسم'}
                      </p>
                    </td>
                    <td className="px-4 py-4 font-bold text-zinc-600 dark:text-zinc-300" dir="ltr">
                      {student.email || '—'}
                    </td>
                    <td className="px-4 py-4 font-bold text-zinc-600 dark:text-zinc-300" dir="ltr">
                      {student.phone || '—'}
                    </td>
                    <td className="px-4 py-4 text-zinc-500">
                      {formatStudentDate(student.enrolled_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

function StudentStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-right dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-2xl font-black text-zinc-950 dark:text-white">{value}</p>
      <p className="mt-1 text-xs font-bold text-zinc-500">{label}</p>
    </div>
  );
}

function formatStudentDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || '—';

  return date.toLocaleDateString('ar-EG', {
    dateStyle: 'medium',
  });
}

function AddFormModal({
  title,
  hint,
  onClose,
  children,
}: {
  title: string;
  hint: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-label="إغلاق"
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-5 flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="text-right">
            <h2 className="text-xl font-black text-zinc-950 dark:text-white">{title}</h2>
            <p className="mt-1 text-xs text-zinc-500">{hint}</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function ConfirmActionModal({
  title,
  message,
  confirmLabel,
  busy,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
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
            <h2 className="text-lg font-black text-zinc-950 dark:text-white">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500">{message}</p>
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
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateLevelPanel({
  courseId,
  onCreated,
  onError,
}: {
  courseId: number;
  onCreated: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [position, setPosition] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      onError('عنوان المستوى مطلوب');
      return;
    }
    setBusy(true);
    try {
      await createCourseLevel(courseId, {
        title: title.trim(),
        description: description.trim() || null,
        position: asOptionalNumber(position),
      });
      setTitle('');
      setDescription('');
      setPosition('');
      await onCreated();
      setOpen(false);
    } catch (e) {
      onError(apiErr(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-4 text-base font-black text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600"
      >
        <Plus className="h-5 w-5" />
        إضافة مستوى جديد
      </button>

      {open && (
        <AddFormModal
          title="إنشاء مستوى داخل الكورس"
          hint="POST /courses/:courseId/levels"
          onClose={() => setOpen(false)}
        >
          <form onSubmit={submit}>
            <div className="grid gap-3 md:grid-cols-[1fr_8rem]">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="عنوان المستوى"
                className={fieldClassName}
              />
              <input
                type="number"
                min={1}
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="position"
                className={fieldClassName}
              />
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="وصف المستوى"
              rows={3}
              className={`${fieldClassName} mt-3 resize-y`}
            />
            <button type="submit" disabled={busy} className={primaryButtonClassName}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              إنشاء المستوى
            </button>
          </form>
        </AddFormModal>
      )}
    </>
  );
}

function LevelCard({
  level,
  index,
  expanded,
  onToggle,
  onChanged,
  onError,
}: {
  level: CourseLevel;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onChanged: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const lessonCount = level.lessons?.length ?? 0;
  const hasExam = Boolean(level.level_exam);
  const levelDescription = level.description?.trim();
  const [levelTab, setLevelTab] = useState<'videos' | 'exams'>('videos');
  const [editLevelOpen, setEditLevelOpen] = useState(false);
  const [deleteLevelOpen, setDeleteLevelOpen] = useState(false);
  const [deletingLevel, setDeletingLevel] = useState(false);
  const [previewLesson, setPreviewLesson] = useState<{ title: string; videoUrl: string } | null>(
    null
  );

  async function handleDeleteLevel() {
    setDeletingLevel(true);
    try {
      await deleteCourseLevel(level.id);
      await onChanged();
      setDeleteLevelOpen(false);
    } catch (e) {
      onError(apiErr(e));
    } finally {
      setDeletingLevel(false);
    }
  }

  return (
    <article className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
      <div className="relative overflow-hidden border-b border-zinc-100 bg-gradient-to-l from-blue-500/10 via-white to-orange-500/10 dark:border-zinc-800 dark:from-blue-950/35 dark:via-zinc-900 dark:to-orange-950/20">
        <div className="absolute -start-12 -top-14 h-36 w-36 rounded-full bg-blue-500/10" />
        <div className="absolute -bottom-16 end-14 h-32 w-32 rounded-full bg-orange-500/10" />
        <div className="relative flex items-start justify-between gap-3 px-5 py-5">
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setEditLevelOpen(true)}
              className="rounded-xl p-2 text-blue-600 transition hover:bg-blue-50 dark:hover:bg-blue-950/30"
              aria-label="تعديل المستوى"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setDeleteLevelOpen(true)}
              disabled={deletingLevel}
              className="rounded-xl p-2 text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:hover:bg-red-950/30"
              aria-label="حذف المستوى"
            >
              {deletingLevel ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={onToggle}
              className="rounded-xl p-2 text-blue-500 transition hover:bg-blue-50 dark:hover:bg-blue-950/30"
              aria-label={expanded ? 'طي المستوى' : 'توسيع المستوى'}
            >
              {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
          </div>
          <button
            type="button"
            onClick={onToggle}
            className="flex min-w-0 flex-1 flex-row-reverse items-start gap-4 text-right"
          >
            <span className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-3xl bg-blue-600 text-white shadow-lg shadow-blue-500/25">
              <span className="text-[10px] font-black leading-none opacity-80">مستوى</span>
              <span className="mt-1 text-2xl font-black leading-none">{index + 1}</span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="inline-flex rounded-full bg-white/80 px-3 py-1 text-[11px] font-black text-blue-600 ring-1 ring-blue-100 dark:bg-zinc-950/80 dark:ring-blue-900/40">
                ترتيب {level.position}
              </span>
              <span className="mt-2 block text-xl font-black text-zinc-950 dark:text-white">
                {level.title}
              </span>
              {levelDescription && (
                <span className="mt-2 block line-clamp-2 text-sm leading-6 text-zinc-500">
                  {levelDescription}
                </span>
              )}
              <span className="mt-3 flex flex-wrap justify-end gap-2">
                <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-bold text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950">
                  معرّف {level.id}
                </span>
                <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300">
                  {lessonCount} {lessonCount === 1 ? 'درس' : 'دروس'}
                </span>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-bold ${
                    hasExam
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300'
                      : 'border-zinc-200 bg-white text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950'
                  }`}
                >
                  {hasExam ? 'امتحان جاهز' : 'بدون امتحان'}
                </span>
              </span>
            </span>
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-zinc-100 dark:border-zinc-800">
          <div className="p-5 pb-0">
            <div className="grid gap-2 rounded-3xl border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-950 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setLevelTab('videos')}
                className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition ${
                  levelTab === 'videos'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'text-zinc-600 hover:bg-white dark:text-zinc-300 dark:hover:bg-zinc-900'
                }`}
              >
                <Video className="h-4 w-4" />
                الفيديوهات
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] ${
                    levelTab === 'videos'
                      ? 'bg-white/20 text-white'
                      : 'bg-white text-zinc-500 dark:bg-zinc-900'
                  }`}
                >
                  {lessonCount}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setLevelTab('exams')}
                className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition ${
                  levelTab === 'exams'
                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                    : 'text-zinc-600 hover:bg-white dark:text-zinc-300 dark:hover:bg-zinc-900'
                }`}
              >
                <ClipboardList className="h-4 w-4" />
                الاختبارات
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] ${
                    levelTab === 'exams'
                      ? 'bg-white/20 text-white'
                      : 'bg-white text-zinc-500 dark:bg-zinc-900'
                  }`}
                >
                  {hasExam ? 1 : 0}
                </span>
              </button>
            </div>
          </div>

          {levelTab === 'videos' ? (
            <div className="space-y-5 p-5">
              <CreateLessonPanel levelId={level.id} onCreated={onChanged} onError={onError} />

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-black text-zinc-500 dark:bg-zinc-800">
                    {lessonCount}
                  </span>
                  <h4 className="text-right text-sm font-black text-zinc-700 dark:text-zinc-200">
                    المحاضرات والفيديو
                  </h4>
                </div>
                {level.lessons?.length ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {level.lessons
                      .slice()
                      .sort((a, b) => a.position - b.position)
                      .map((lesson) => (
                        <LessonCard
                          key={lesson.id}
                          lesson={lesson}
                          onChanged={onChanged}
                          onError={onError}
                          onPreview={(videoUrl) =>
                            setPreviewLesson({ title: lesson.title, videoUrl })
                          }
                        />
                      ))}
                  </div>
                ) : (
                  <p className="rounded-2xl border border-dashed border-zinc-300 py-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
                    لا توجد دروس في هذا المستوى بعد.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="p-5">
              <CreateLevelExamPanel
                level={level}
                courseId={level.course_id}
                onCreated={onChanged}
                onError={onError}
              />
            </div>
          )}
        </div>
      )}

      {previewLesson && (
        <VideoPreviewModal
          title={previewLesson.title}
          videoUrl={previewLesson.videoUrl}
          onClose={() => setPreviewLesson(null)}
        />
      )}

      {editLevelOpen && (
        <EditLevelModal
          level={level}
          onClose={() => setEditLevelOpen(false)}
          onSaved={async () => {
            await onChanged();
            setEditLevelOpen(false);
          }}
          onError={onError}
        />
      )}

      {deleteLevelOpen && (
        <ConfirmActionModal
          title="تأكيد حذف المستوى"
          message={`هل تريد حذف المستوى "${level.title}"؟ سيتم حذف محتواه المرتبط من الخادم.`}
          confirmLabel="حذف المستوى"
          busy={deletingLevel}
          onCancel={() => setDeleteLevelOpen(false)}
          onConfirm={handleDeleteLevel}
        />
      )}
    </article>
  );
}

function EditLevelModal({
  level,
  onClose,
  onSaved,
  onError,
}: {
  level: CourseLevel;
  onClose: () => void;
  onSaved: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const [title, setTitle] = useState(level.title);
  const [description, setDescription] = useState(level.description ?? '');
  const [position, setPosition] = useState(String(level.position));
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      onError('عنوان المستوى مطلوب');
      return;
    }

    setBusy(true);
    try {
      await updateCourseLevel(level.id, {
        title: title.trim(),
        description: description.trim() || null,
        position: asOptionalNumber(position),
      });
      await onSaved();
    } catch (e) {
      onError(apiErr(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AddFormModal
      title="تعديل المستوى"
      hint="PATCH /course-management/levels/:levelId"
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className="grid gap-3 md:grid-cols-[1fr_8rem]">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="عنوان المستوى"
            className={fieldClassName}
          />
          <input
            type="number"
            min={1}
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            placeholder="position"
            className={fieldClassName}
          />
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="وصف المستوى"
          rows={3}
          className={`${fieldClassName} mt-3 resize-y`}
        />
        <button type="submit" disabled={busy} className={primaryButtonClassName}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          حفظ تعديل المستوى
        </button>
      </form>
    </AddFormModal>
  );
}

function LessonCard({
  lesson,
  onChanged,
  onError,
  onPreview,
}: {
  lesson: CourseLesson;
  onChanged: () => Promise<void>;
  onError: (message: string) => void;
  onPreview: (videoUrl: string) => void;
}) {
  const videoUrl = lesson.video_url?.trim();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteLevelLesson(lesson.id);
      await onChanged();
      setDeleteOpen(false);
    } catch (e) {
      onError(apiErr(e));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-right transition hover:border-blue-200 hover:bg-blue-50/40 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-blue-900/50 dark:hover:bg-blue-950/20">
      <div className="flex flex-row-reverse items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black text-blue-600">المحاضرة #{lesson.position}</p>
          <p className="mt-1 font-black text-zinc-950 dark:text-white">{lesson.title}</p>
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-500 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
          <Video className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-500">
        {lesson.description || 'لا يوجد وصف'}
      </p>

      {videoUrl ? (
        <button
          type="button"
          onClick={() => onPreview(videoUrl)}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-700"
        >
          <Video className="h-4 w-4" />
          مشاهدة الفيديو
        </button>
      ) : (
        <span className="mt-4 inline-flex w-full items-center justify-center rounded-2xl border border-dashed border-zinc-300 px-4 py-2.5 text-xs font-bold text-zinc-400 dark:border-zinc-700">
          لا يوجد فيديو مرفق
        </span>
      )}

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-white px-3 py-2 text-xs font-black text-blue-700 transition hover:bg-blue-50 dark:border-blue-900/50 dark:bg-zinc-900 dark:text-blue-300 dark:hover:bg-blue-950/30"
        >
          <Pencil className="h-3.5 w-3.5" />
          تعديل
        </button>
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          disabled={deleting}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-100 bg-white px-3 py-2 text-xs font-black text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-900/50 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-red-950/30"
        >
          {deleting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
          حذف
        </button>
      </div>

      {editOpen && (
        <EditLessonModal
          lesson={lesson}
          onClose={() => setEditOpen(false)}
          onSaved={async () => {
            await onChanged();
            setEditOpen(false);
          }}
          onError={onError}
        />
      )}

      {deleteOpen && (
        <ConfirmActionModal
          title="تأكيد حذف الدرس"
          message={`هل تريد حذف الدرس "${lesson.title}"؟`}
          confirmLabel="حذف الدرس"
          busy={deleting}
          onCancel={() => setDeleteOpen(false)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}

function EditLessonModal({
  lesson,
  onClose,
  onSaved,
  onError,
}: {
  lesson: CourseLesson;
  onClose: () => void;
  onSaved: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const [title, setTitle] = useState(lesson.title);
  const [description, setDescription] = useState(lesson.description ?? '');
  const [videoUrl, setVideoUrl] = useState(lesson.video_url ?? '');
  const [position, setPosition] = useState(String(lesson.position));
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      onError('عنوان الدرس مطلوب');
      return;
    }

    setBusy(true);
    try {
      await updateLevelLesson(lesson.id, {
        title: title.trim(),
        description: description.trim() || null,
        video_url: videoUrl.trim() || null,
        position: asOptionalNumber(position),
      });
      await onSaved();
    } catch (e) {
      onError(apiErr(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AddFormModal
      title="تعديل الدرس"
      hint="PATCH /course-management/lessons/:lessonId"
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className="space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="عنوان الدرس"
            className={fieldClassName}
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="وصف الدرس"
            rows={3}
            className={fieldClassName}
          />
          <input
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="video_url"
            className={fieldClassName}
            dir="ltr"
          />
          <input
            type="number"
            min={1}
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            placeholder="position"
            className={fieldClassName}
          />
        </div>
        <button type="submit" disabled={busy} className={secondaryButtonClassName}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          حفظ تعديل الدرس
        </button>
      </form>
    </AddFormModal>
  );
}

function VideoPreviewModal({
  title,
  videoUrl,
  onClose,
}: {
  title: string;
  videoUrl: string;
  onClose: () => void;
}) {
  const embedUrl = getEmbeddableVideoUrl(videoUrl);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="إغلاق مشاهدة الفيديو"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-5xl overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-950 shadow-2xl dark:border-zinc-800">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-zinc-950 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-zinc-300 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="min-w-0 text-right">
            <p className="text-xs font-black text-blue-300">مشاهدة الفيديو</p>
            <h3 className="truncate text-base font-black text-white">{title}</h3>
          </div>
        </div>
        <div className="aspect-video w-full bg-black">
          <iframe
            src={embedUrl}
            title={`مشاهدة ${title}`}
            className="h-full w-full"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        </div>
        <div className="flex flex-row-reverse items-center justify-between gap-3 bg-zinc-950 px-4 py-3 text-right">
          <p className="text-xs text-zinc-400">
            لو لم يظهر الفيديو، تأكد من صلاحيات مشاركة ملف Google Drive.
          </p>
          <a
            href={videoUrl}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 rounded-xl bg-white/10 px-3 py-2 text-xs font-black text-white transition hover:bg-white/15"
          >
            فتح الرابط الأصلي
          </a>
        </div>
      </div>
    </div>
  );
}

function CreateLessonPanel({
  levelId,
  onCreated,
  onError,
}: {
  levelId: number;
  onCreated: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [position, setPosition] = useState('');
  const [files, setFiles] = useState<CourseLessonFilePayload[]>([
    { file_url: '', file_type: 'pdf' },
  ]);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      onError('عنوان الدرس مطلوب');
      return;
    }
    setBusy(true);
    try {
      await createLevelLesson(levelId, {
        title: title.trim(),
        description: description.trim() || null,
        video_url: videoUrl.trim() || null,
        position: asOptionalNumber(position),
        files: files.filter((file) => file.file_url.trim()),
      });
      setTitle('');
      setDescription('');
      setVideoUrl('');
      setPosition('');
      setFiles([{ file_url: '', file_type: 'pdf' }]);
      await onCreated();
      setOpen(false);
    } catch (e) {
      onError(apiErr(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="rounded-2xl border border-dashed border-zinc-300 p-4 dark:border-zinc-700">
        <PanelHeader icon={Video} title="إنشاء درس" hint="أضف درسًا جديدًا داخل هذا المستوى" />
        <button type="button" onClick={() => setOpen(true)} className={secondaryButtonClassName}>
          <Plus className="h-4 w-4" />
          إضافة درس
        </button>
      </div>

      {open && (
        <AddFormModal
          title="إنشاء درس"
          hint="POST /levels/:levelId/lessons"
          onClose={() => setOpen(false)}
        >
          <form onSubmit={submit}>
            <div className="space-y-3">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان الدرس" className={fieldClassName} />
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="وصف الدرس" rows={2} className={fieldClassName} />
              <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="video_url" className={fieldClassName} dir="ltr" />
              <input type="number" min={1} value={position} onChange={(e) => setPosition(e.target.value)} placeholder="position اختياري" className={fieldClassName} />

              <div className="rounded-2xl bg-zinc-50 p-3 dark:bg-zinc-950">
                <p className="mb-2 text-right text-xs font-black text-zinc-500">ملفات الدرس</p>
                {files.map((file, idx) => (
                  <div key={idx} className="mb-2 grid gap-2 sm:grid-cols-[1fr_7rem_2rem]">
                    <input
                      value={file.file_url}
                      onChange={(e) =>
                        setFiles((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, file_url: e.target.value } : item
                          )
                        )
                      }
                      placeholder="file_url"
                      className={fieldClassName}
                      dir="ltr"
                    />
                    <input
                      value={file.file_type}
                      onChange={(e) =>
                        setFiles((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, file_type: e.target.value } : item
                          )
                        )
                      }
                      placeholder="pdf"
                      className={fieldClassName}
                    />
                    <button
                      type="button"
                      onClick={() => setFiles((prev) => prev.filter((_, i) => i !== idx))}
                      className="rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                      aria-label="حذف ملف"
                    >
                      <X className="mx-auto h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setFiles((prev) => [...prev, { file_url: '', file_type: 'pdf' }])}
                  className="text-xs font-bold text-blue-600"
                >
                  + إضافة ملف
                </button>
              </div>
            </div>
            <button type="submit" disabled={busy} className={secondaryButtonClassName}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              إنشاء الدرس
            </button>
          </form>
        </AddFormModal>
      )}
    </>
  );
}

function CreateLevelExamPanel({
  level,
  courseId,
  onCreated,
  onError,
}: {
  level: CourseLevel;
  courseId: number;
  onCreated: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [passPercentage, setPassPercentage] = useState('70');
  const [busy, setBusy] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      onError('عنوان امتحان المستوى مطلوب');
      return;
    }
    const pass = Number(passPercentage);
    if (!Number.isFinite(pass)) {
      onError('نسبة النجاح يجب أن تكون رقمًا');
      return;
    }
    setBusy(true);
    try {
      await createLevelExam(level.id, {
        title: title.trim(),
        pass_percentage: pass,
      });
      setTitle('');
      setPassPercentage('70');
      await onCreated();
      setOpen(false);
    } catch (e) {
      onError(apiErr(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteExam() {
    if (!level.level_exam) return;

    setDeleting(true);
    try {
      await deleteLevelExam(level.level_exam.id);
      await onCreated();
      setDeleteOpen(false);
    } catch (e) {
      onError(apiErr(e));
    } finally {
      setDeleting(false);
    }
  }

  async function toggleExamStatus() {
    if (!level.level_exam) return;

    setStatusBusy(true);
    try {
      await updateLevelExamStatus(level.level_exam.id, !level.level_exam.is_active);
      await onCreated();
    } catch (e) {
      onError(apiErr(e));
    } finally {
      setStatusBusy(false);
    }
  }

  if (level.level_exam) {
    const exam = level.level_exam;

    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-right dark:border-emerald-900/50 dark:bg-emerald-950/20">
        <PanelHeader icon={ClipboardList} title="امتحان المستوى" hint="تم إنشاء امتحان لهذا المستوى" />
        <div className="mt-4 flex flex-row-reverse items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-black text-zinc-950 dark:text-white">{exam.title}</p>
            <p className="mt-1 text-sm text-zinc-500">
              نسبة النجاح: {exam.pass_percentage}%
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${
              exam.is_active
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
            }`}
          >
            {exam.is_active ? 'نشط' : 'متوقف'}
          </span>
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          {exam.duration_minutes != null ? `${exam.duration_minutes} دقيقة` : 'بدون مدة'} ·{' '}
          {exam.max_attempts != null ? `${exam.max_attempts} محاولة` : 'محاولات غير محددة'} ·{' '}
          {exam.questions_per_attempt != null
            ? `${exam.questions_per_attempt} سؤال/محاولة`
            : 'كل الأسئلة'}
        </p>
        <Link
          href={`/library/level-exams/${exam.id}?courseId=${courseId}&levelTitle=${encodeURIComponent(level.title)}&title=${encodeURIComponent(exam.title)}`}
          className={secondaryButtonClassName}
        >
          <FileQuestion className="h-4 w-4" />
          دخول الاختبار
        </Link>

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-white px-3 py-2 text-xs font-black text-blue-700 transition hover:bg-blue-50 dark:border-blue-900/50 dark:bg-zinc-900 dark:text-blue-300 dark:hover:bg-blue-950/30"
          >
            <Pencil className="h-3.5 w-3.5" />
            تعديل
          </button>
          <button
            type="button"
            onClick={toggleExamStatus}
            disabled={statusBusy}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-xs font-black text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {statusBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Power className="h-3.5 w-3.5" />
            )}
            {exam.is_active ? 'إيقاف' : 'تفعيل'}
          </button>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            disabled={deleting}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-100 bg-white px-3 py-2 text-xs font-black text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-900/50 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            {deleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            حذف
          </button>
        </div>

        {editOpen && (
          <EditLevelExamModal
            exam={exam}
            onClose={() => setEditOpen(false)}
            onSaved={async () => {
              await onCreated();
              setEditOpen(false);
            }}
            onError={onError}
          />
        )}

        {deleteOpen && (
          <ConfirmActionModal
            title="تأكيد حذف اختبار المستوى"
            message={`هل تريد حذف اختبار "${exam.title}"؟`}
            confirmLabel="حذف الاختبار"
            busy={deleting}
            onCancel={() => setDeleteOpen(false)}
            onConfirm={handleDeleteExam}
          />
        )}
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl border border-dashed border-zinc-300 p-4 dark:border-zinc-700">
        <PanelHeader icon={ClipboardList} title="إنشاء امتحان مستوى" hint="أضف امتحانًا لهذا المستوى" />
        <button type="button" onClick={() => setOpen(true)} className={secondaryButtonClassName}>
          <Plus className="h-4 w-4" />
          إضافة امتحان
        </button>
      </div>

      {open && (
        <AddFormModal
          title="إنشاء امتحان مستوى"
          hint="POST /levels/:levelId/exam"
          onClose={() => setOpen(false)}
        >
          <form onSubmit={submit}>
            <div className="space-y-3">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Level 1 Quiz" className={fieldClassName} />
              <input type="number" min={0} max={100} value={passPercentage} onChange={(e) => setPassPercentage(e.target.value)} placeholder="pass_percentage" className={fieldClassName} />
            </div>
            <button type="submit" disabled={busy} className={secondaryButtonClassName}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              إنشاء الامتحان
            </button>
          </form>
        </AddFormModal>
      )}
    </>
  );
}

function EditLevelExamModal({
  exam,
  onClose,
  onSaved,
  onError,
}: {
  exam: CourseLevelExam;
  onClose: () => void;
  onSaved: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const [title, setTitle] = useState(exam.title);
  const [passPercentage, setPassPercentage] = useState(String(exam.pass_percentage));
  const [durationMinutes, setDurationMinutes] = useState(
    exam.duration_minutes != null ? String(exam.duration_minutes) : ''
  );
  const [isActive, setIsActive] = useState(exam.is_active);
  const [maxAttempts, setMaxAttempts] = useState(
    exam.max_attempts != null ? String(exam.max_attempts) : ''
  );
  const [questionsPerAttempt, setQuestionsPerAttempt] = useState(
    exam.questions_per_attempt != null ? String(exam.questions_per_attempt) : ''
  );
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      onError('عنوان امتحان المستوى مطلوب');
      return;
    }

    const pass = Number(passPercentage);
    if (!Number.isFinite(pass)) {
      onError('نسبة النجاح يجب أن تكون رقمًا');
      return;
    }

    const duration = asNullableNumber(durationMinutes);
    const attempts = asNullableNumber(maxAttempts);
    const questions = asNullableNumber(questionsPerAttempt);
    if (
      (durationMinutes.trim() && duration == null) ||
      (maxAttempts.trim() && attempts == null) ||
      (questionsPerAttempt.trim() && questions == null)
    ) {
      onError('مدة الاختبار وعدد المحاولات وعدد الأسئلة يجب أن تكون أرقامًا صحيحة');
      return;
    }

    setBusy(true);
    try {
      await updateLevelExam(exam.id, {
        title: title.trim(),
        pass_percentage: pass,
        duration_minutes: duration,
        is_active: isActive,
        max_attempts: attempts,
        questions_per_attempt: questions,
      });
      await onSaved();
    } catch (e) {
      onError(apiErr(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AddFormModal
      title="تعديل اختبار المستوى"
      hint="PATCH /course-management/level-exams/:examId"
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className="space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="عنوان الاختبار"
            className={fieldClassName}
          />
          <div className="grid gap-3 md:grid-cols-2">
            <input
              type="number"
              min={0}
              max={100}
              value={passPercentage}
              onChange={(e) => setPassPercentage(e.target.value)}
              placeholder="pass_percentage"
              className={fieldClassName}
            />
            <input
              type="number"
              min={1}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              placeholder="duration_minutes"
              className={fieldClassName}
            />
            <input
              type="number"
              min={1}
              value={maxAttempts}
              onChange={(e) => setMaxAttempts(e.target.value)}
              placeholder="max_attempts"
              className={fieldClassName}
            />
            <input
              type="number"
              min={1}
              value={questionsPerAttempt}
              onChange={(e) => setQuestionsPerAttempt(e.target.value)}
              placeholder="questions_per_attempt"
              className={fieldClassName}
            />
          </div>
          <label className="flex cursor-pointer items-center justify-between rounded-2xl bg-zinc-50 px-4 py-3 text-sm font-bold dark:bg-zinc-950">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            الاختبار نشط
          </label>
        </div>
        <button type="submit" disabled={busy} className={secondaryButtonClassName}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          حفظ تعديل الاختبار
        </button>
      </form>
    </AddFormModal>
  );
}

function CreateGeneralExamPanel({
  courseId,
  onCreated,
  onError,
}: {
  courseId: number;
  onCreated: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [isFinal, setIsFinal] = useState(false);
  const [passPercentage, setPassPercentage] = useState('80');
  const [isActive, setIsActive] = useState(true);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      onError('عنوان الامتحان مطلوب');
      return;
    }
    const pass = asOptionalNumber(passPercentage);
    if (isFinal && pass == null) {
      onError('الامتحان النهائي يتطلب pass_percentage');
      return;
    }
    setBusy(true);
    try {
      await createGeneralExam(courseId, {
        title: title.trim(),
        is_final: isFinal,
        ...(pass != null ? { pass_percentage: pass } : {}),
        is_active: isActive,
      });
      setTitle('');
      setIsFinal(false);
      setPassPercentage('80');
      setIsActive(true);
      await onCreated();
      setOpen(false);
    } catch (e) {
      onError(apiErr(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <SectionTitle
          icon={FileQuestion}
          title="امتحان عام/نهائي"
          hint="أضف امتحانًا عامًا أو نهائيًا للكورس"
        />
        <button type="button" onClick={() => setOpen(true)} className={primaryButtonClassName}>
          <Plus className="h-4 w-4" />
          إضافة امتحان
        </button>
      </section>

      {open && (
        <AddFormModal
          title="امتحان عام/نهائي"
          hint="POST /courses/:courseId/general-exams"
          onClose={() => setOpen(false)}
        >
          <form onSubmit={submit}>
            <div className="space-y-3">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Final Exam" className={fieldClassName} />
              <input type="number" min={0} max={100} value={passPercentage} onChange={(e) => setPassPercentage(e.target.value)} placeholder="pass_percentage" className={fieldClassName} />
              <label className="flex cursor-pointer items-center justify-between rounded-2xl bg-zinc-50 px-4 py-3 text-sm font-bold dark:bg-zinc-950">
                <input type="checkbox" checked={isFinal} onChange={(e) => setIsFinal(e.target.checked)} />
                امتحان نهائي
              </label>
              <label className="flex cursor-pointer items-center justify-between rounded-2xl bg-zinc-50 px-4 py-3 text-sm font-bold dark:bg-zinc-950">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                نشط
              </label>
            </div>
            <button type="submit" disabled={busy} className={primaryButtonClassName}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              إنشاء الامتحان
            </button>
          </form>
        </AddFormModal>
      )}
    </>
  );
}

function GeneralExamsPanel({
  exams,
  courseTitle,
}: {
  exams: CourseGeneralExam[];
  courseTitle: string;
}) {
  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <SectionTitle
        icon={FileQuestion}
        title="الامتحانات العامة"
        hint="أضف أسئلة MCQ لأي امتحان عام أو نهائي."
      />
      <div className="mt-5 space-y-3">
        {exams.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-zinc-300 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
            لا توجد امتحانات عامة بعد.
          </p>
        ) : (
          exams.map((exam) => (
            <div key={exam.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-right dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-start justify-between gap-3">
                <span className={`rounded-full px-2 py-1 text-xs font-black ${
                  exam.is_final
                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300'
                    : 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                }`}>
                  {exam.is_final ? 'نهائي' : 'عام'}
                </span>
                <div>
                  <p className="font-black text-zinc-950 dark:text-white">{exam.title}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {exam.pass_percentage != null ? `${exam.pass_percentage}%` : 'بدون نسبة نجاح'}
                  </p>
                </div>
              </div>
              <Link
                href={`/library/general-exams/${exam.id}?courseId=${exam.course_id}&courseTitle=${encodeURIComponent(courseTitle)}&title=${encodeURIComponent(exam.title)}`}
                className={secondaryButtonClassName}
              >
                <FileQuestion className="h-4 w-4" />
                دخول الامتحان
              </Link>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function PanelHeader({
  icon: Icon,
  title,
  hint,
}: {
  icon: typeof BookOpen;
  title: string;
  hint: string;
}) {
  return (
    <div className="flex flex-row-reverse items-start gap-2 text-right">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="font-black text-zinc-950 dark:text-white">{title}</p>
        <p className="mt-1 text-xs text-zinc-500">{hint}</p>
      </div>
    </div>
  );
}

const fieldClassName =
  'w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-right text-sm outline-none transition placeholder:text-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100';

const primaryButtonClassName =
  'mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-700 disabled:opacity-60';

const secondaryButtonClassName =
  'mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-black text-blue-700 transition hover:bg-blue-100 disabled:opacity-60 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300';
