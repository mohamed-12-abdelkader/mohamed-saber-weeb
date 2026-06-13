'use client';

import {
  BarChart3,
  BookOpen,
  Camera,
  CheckCircle2,
  ChevronLeft,
  Filter,
  FileText,
  GraduationCap,
  ImageIcon,
  Info,
  Layers,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  School,
  Sparkles,
  Trash2,
  UploadCloud,
  WalletCards,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  createAdminCourse,
  deleteAdminCourse,
  fetchAdminCourses,
  fetchPlacementLevels,
  updateAdminCourse,
  type AdminCourse,
  type AdminCoursePayload,
  type AdminCourseType,
  type AdminPlacementLevel,
} from '@/lib/admin-courses-api';
import { API_BASE_URL } from '@/lib/api';
import { apiErr } from '@/lib/library-errors';

type CourseTypeFilter = 'all' | AdminCourseType;
type CourseModalState =
  | { mode: 'create'; course?: undefined }
  | { mode: 'edit'; course: AdminCourse };

function formatArNumber(n: number) {
  return Math.round(n).toLocaleString('ar-EG');
}

function formatPrice(n: number) {
  return Number(n || 0).toLocaleString('ar-EG', {
    maximumFractionDigits: 2,
  });
}

function resolveImageUrl(raw: string | null | undefined): string | null {
  const url = raw?.trim();
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const base = API_BASE_URL.replace(/\/$/, '');
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${base}${path}`;
}

function courseTypeLabel(type: AdminCourseType) {
  return type === 'qdrat' ? 'قدرات' : 'تحصيلي';
}

export function AdminCoursesManagement() {
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [courseType, setCourseType] = useState<CourseTypeFilter>('all');
  const [placementLevelId, setPlacementLevelId] = useState('');
  const [modal, setModal] = useState<CourseModalState | null>(null);

  function buildCourseParams(overrides?: {
    courseType?: CourseTypeFilter;
    placementLevelId?: string;
  }) {
    const effectiveCourseType = overrides?.courseType ?? courseType;
    const effectivePlacementLevelId =
      overrides?.placementLevelId ?? placementLevelId;
    const levelId = effectivePlacementLevelId.trim()
      ? Number(effectivePlacementLevelId.trim())
      : undefined;

    return {
      ...(effectiveCourseType !== 'all'
        ? { course_type: effectiveCourseType }
        : {}),
      ...(levelId && Number.isFinite(levelId)
        ? { placement_level_id: levelId }
        : {}),
    };
  }

  async function loadCourses(overrides?: {
    courseType?: CourseTypeFilter;
    placementLevelId?: string;
  }) {
    setBanner(null);
    setLoading(true);
    try {
      const list = await fetchAdminCourses(buildCourseParams(overrides));
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
        const list = await fetchAdminCourses(buildCourseParams());
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseType]);

  const visibleCourses = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter(
      (course) =>
        course.title.toLowerCase().includes(q) ||
        (course.description?.toLowerCase().includes(q) ?? false) ||
        (course.placement_level_name?.toLowerCase().includes(q) ?? false)
    );
  }, [courses, search]);

  const qdratCount = courses.filter((c) => c.course_type === 'qdrat').length;
  const tahseeliCount = courses.filter((c) => c.course_type === 'tahseeli').length;
  const totalRevenue = courses.reduce((sum, c) => sum + Number(c.price || 0), 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">
      <section className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="bg-gradient-to-l from-blue-600 via-blue-500 to-orange-500 px-6 py-7 text-white md:px-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="text-right">
              <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur">
                <BookOpen className="h-4 w-4" />
                /api/admin/courses
              </p>
              <h1 className="mt-4 text-3xl font-black tracking-tight md:text-4xl">
                إدارة الكورسات
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/85">
                إنشاء، تعديل، حذف، وتصفية كورسات المنصة حسب النوع ومستوى تحديد
                المستوى مع دعم رفع صورة الكورس كما هو موضح في التوثيق.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setModal({ mode: 'create' })}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-blue-700 shadow-lg transition hover:bg-blue-50"
            >
              <Plus className="h-5 w-5" />
              كورس جديد
            </button>
          </div>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 md:p-6">
          <StatCard icon={BookOpen} label="إجمالي الكورسات" value={courses.length} />
          <StatCard icon={GraduationCap} label="قدرات" value={qdratCount} />
          <StatCard icon={Layers} label="تحصيلي" value={tahseeliCount} />
          <StatCard
            icon={WalletCards}
            label="إجمالي الأسعار"
            value={totalRevenue}
            suffix="ر.س"
          />
        </div>
      </section>

      {banner && (
        <div
          className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          {banner}
        </div>
      )}

      <section className="mt-6 rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 md:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950">
              <Search className="h-4 w-4 shrink-0 text-zinc-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث باسم الكورس أو الوصف..."
                className="min-w-0 flex-1 bg-transparent text-right text-sm outline-none placeholder:text-zinc-400 dark:text-zinc-100"
              />
            </div>
            <select
              value={courseType}
              onChange={(e) => {
                setLoading(true);
                setCourseType(e.target.value as CourseTypeFilter);
              }}
              className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
            >
              <option value="all">كل الأنواع</option>
              <option value="qdrat">قدرات</option>
              <option value="tahseeli">تحصيلي</option>
            </select>
            <input
              type="number"
              min={1}
              value={placementLevelId}
              onChange={(e) => setPlacementLevelId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void loadCourses();
              }}
              placeholder="placement_level_id"
              className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void loadCourses()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
            >
              <Filter className="h-4 w-4" />
              تطبيق
            </button>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setPlacementLevelId('');
                setCourseType('all');
                void loadCourses({ courseType: 'all', placementLevelId: '' });
              }}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
            >
              <RefreshCw className="h-4 w-4" />
              تحديث
            </button>
          </div>
        </div>
      </section>

      <section className="mt-6">
        {loading ? (
          <div className="rounded-3xl border border-zinc-200 bg-white py-16 text-center text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
            <Loader2 className="mx-auto mb-3 h-7 w-7 animate-spin" />
            جاري تحميل الكورسات...
          </div>
        ) : visibleCourses.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-300 bg-white py-16 text-center dark:border-zinc-700 dark:bg-zinc-900">
            <BookOpen className="mx-auto h-12 w-12 text-zinc-400" />
            <p className="mt-3 font-bold text-zinc-800 dark:text-zinc-100">
              لا توجد كورسات مطابقة
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              جرّب تغيير الفلاتر أو أنشئ كورس جديد.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {visibleCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                onEdit={() => setModal({ mode: 'edit', course })}
                onDelete={() => {
                  if (confirm(`حذف «${course.title}» نهائيًا؟`)) {
                    void (async () => {
                      try {
                        await deleteAdminCourse(course.id);
                        await loadCourses();
                      } catch (e) {
                        setBanner(apiErr(e));
                      }
                    })();
                  }
                }}
              />
            ))}
          </div>
        )}
      </section>

      {modal && (
        <CourseEditorModal
          state={modal}
          onClose={() => setModal(null)}
          onSaved={async () => {
            await loadCourses();
            setModal(null);
          }}
        />
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  suffix,
}: {
  icon: typeof BookOpen;
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-right dark:border-zinc-800 dark:bg-zinc-950">
      <Icon className="ms-auto h-5 w-5 text-blue-500" />
      <p className="mt-3 text-2xl font-black text-zinc-950 dark:text-white">
        {formatArNumber(value)} {suffix ?? ''}
      </p>
      <p className="text-xs font-bold text-zinc-500">{label}</p>
    </div>
  );
}

function CourseCard({
  course,
  onEdit,
  onDelete,
}: {
  course: AdminCourse;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const imageUrl = resolveImageUrl(course.image_url);
  const isQdrat = course.course_type === 'qdrat';

  return (
    <article className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
      <Link href={`/library/admin-courses/${course.id}`} className="block">
        <div className="relative flex h-48 items-center justify-center bg-zinc-100 dark:bg-zinc-950">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt={course.title} className="h-full w-full object-cover" />
          ) : (
            <div className="text-center text-zinc-400">
              <ImageIcon className="mx-auto h-12 w-12" />
              <p className="mt-2 text-xs font-bold">لا توجد صورة</p>
            </div>
          )}
          <span
            className={`absolute end-3 top-3 rounded-full px-3 py-1 text-xs font-black text-white ${
              isQdrat ? 'bg-blue-600' : 'bg-orange-500'
            }`}
          >
            {courseTypeLabel(course.course_type)}
          </span>
        </div>
        <div className="p-5 pb-0 text-right">
          <h2 className="text-lg font-black text-zinc-950 transition hover:text-blue-600 dark:text-white">
            {course.title}
          </h2>
          <p className="mt-2 line-clamp-2 min-h-12 text-sm leading-6 text-zinc-500">
            {course.description || 'لا يوجد وصف'}
          </p>
          <div className="mt-4 grid gap-2 text-sm">
            <InfoRow label="السعر" value={`${formatPrice(course.price)} ر.س`} />
            <InfoRow
              label="مستوى التحديد"
              value={
                course.placement_level_name ??
                (course.placement_level_id ? `#${course.placement_level_id}` : '—')
              }
            />
          </div>
          <p className="mt-4 inline-flex items-center gap-1 text-sm font-black text-blue-600">
            إدارة محتوى الكورس
            <ChevronLeft className="h-4 w-4" />
          </p>
        </div>
      </Link>
      <div className="p-5 pt-4 text-right">
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700 transition hover:bg-blue-100 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300"
          >
            <Pencil className="h-4 w-4" />
            تعديل
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center justify-center rounded-2xl border border-red-100 px-3 py-2 text-red-600 transition hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/30"
            aria-label="حذف الكورس"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-zinc-50 px-3 py-2 dark:bg-zinc-950">
      <span className="font-bold text-zinc-900 dark:text-zinc-100">{value}</span>
      <span className="text-xs font-medium text-zinc-500">{label}</span>
    </div>
  );
}

function CourseEditorModal({
  state,
  onClose,
  onSaved,
}: {
  state: CourseModalState;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const course = state.course;
  const isEdit = state.mode === 'edit';
  const [title, setTitle] = useState(course?.title ?? '');
  const [description, setDescription] = useState(course?.description ?? '');
  const [price, setPrice] = useState(course ? String(course.price) : '');
  const [courseType, setCourseType] = useState<AdminCourseType>(
    course?.course_type ?? 'qdrat'
  );
  const [placementLevelId, setPlacementLevelId] = useState(
    course?.placement_level_id ? String(course.placement_level_id) : ''
  );
  const [imageUrl, setImageUrl] = useState(course?.image_url ?? '');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [levels, setLevels] = useState<AdminPlacementLevel[]>([]);
  const [levelsLoading, setLevelsLoading] = useState(true);
  const [clearImage, setClearImage] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchPlacementLevels()
      .then((list) => {
        if (cancelled) return;
        setLevels(list);
        if (!isEdit && !placementLevelId && list.length > 0) {
          setPlacementLevelId(String(list[0].id));
        }
      })
      .catch(() => {
        if (!cancelled) setLevels([]);
      })
      .finally(() => {
        if (!cancelled) setLevelsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // نحتاج تحميل المستويات مرة واحدة عند فتح الفورم فقط
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    };
  }, [filePreviewUrl]);

  const selectedLevelName =
    courseType === 'tahseeli'
      ? 'بدون ربط مستوى'
      : levels.find((level) => String(level.id) === placementLevelId)?.name ??
        (placementLevelId ? `#${placementLevelId}` : 'اختر المستوى');
  const previewUrl =
    !clearImage && filePreviewUrl
      ? filePreviewUrl
      : !clearImage
        ? resolveImageUrl(imageUrl)
        : null;

  function chooseImage(file: File | null) {
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    setImageFile(file);
    setFilePreviewUrl(file ? URL.createObjectURL(file) : null);
    if (file) {
      setImageUrl('');
      setClearImage(false);
    }
  }

  function clearCourseImage() {
    chooseImage(null);
    setImageUrl('');
    setClearImage(isEdit);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    const numericPrice = isEdit ? (course?.price ?? 0) : Number(price);
    const numericPlacement = placementLevelId.trim()
      ? Number(placementLevelId)
      : undefined;

    if (!title.trim()) {
      setErr('عنوان الكورس مطلوب');
      return;
    }
    if (!isEdit && (!Number.isFinite(numericPrice) || numericPrice < 0)) {
      setErr('السعر يجب أن يكون رقمًا أكبر من أو يساوي صفر');
      return;
    }
    if (
      courseType === 'qdrat' &&
      (!numericPlacement || !Number.isFinite(numericPlacement))
    ) {
      setErr('placement_level_id مطلوب لكورسات القدرات');
      return;
    }

    const payload: AdminCoursePayload = {
      title: title.trim(),
      description: description.trim() || null,
      course_type: courseType,
      ...(courseType === 'qdrat'
        ? { placement_level_id: numericPlacement }
        : isEdit
          ? { placement_level_id: null }
          : {}),
    };
    if (!isEdit) {
      payload.price = numericPrice;
    }

    if (clearImage) {
      payload.image_url = null;
    } else if (imageUrl.trim()) {
      payload.image_url = imageUrl.trim();
    }

    setBusy(true);
    try {
      if (state.mode === 'create') {
        await createAdminCourse(payload, imageFile);
      } else {
        await updateAdminCourse(state.course.id, payload, imageFile);
      }
      await onSaved();
    } catch (e) {
      setErr(apiErr(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-label="إغلاق"
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-zinc-200 bg-zinc-50 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
        <div className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-zinc-200/70 bg-white/95 px-5 py-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-zinc-500 transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="text-right">
            <h2 className="text-xl font-black text-zinc-950 dark:text-white">
              {isEdit ? 'تعديل الكورس' : 'إنشاء كورس جديد'}
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              نفس تنظيم فورم التطبيق: بيانات، سعر وتصنيف، ثم غلاف بصري.
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4 p-4 md:p-5">
          <section className="relative overflow-hidden rounded-3xl bg-blue-500 p-5 text-white shadow-lg shadow-blue-500/20">
            <div className="absolute -left-10 -top-10 h-36 w-36 rounded-full bg-orange-400/25" />
            <div className="relative flex flex-row-reverse items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/40 bg-white/15">
                {isEdit ? (
                  <Pencil className="h-7 w-7" />
                ) : (
                  <Sparkles className="h-7 w-7" />
                )}
              </div>
              <div className="min-w-0 flex-1 text-right">
                <span className="inline-flex rounded-full bg-white/20 px-3 py-1 text-xs font-black">
                  لوحة التحكم · الكورسات
                </span>
                <h3 className="mt-3 text-2xl font-black">
                  {isEdit ? 'تعديل الكورس' : 'إنشاء كورس جديد'}
                </h3>
                <p className="mt-2 text-sm leading-6 text-white/90">
                  {isEdit
                    ? 'حدّث العنوان والتصنيف والصورة كما يظهر للطلاب.'
                    : 'عرّف الكورس بوضوح، اختر النوع والسعر، وأضف صورة غلاف احترافية.'}
                </p>
              </div>
            </div>
            <div className="relative mt-5 flex gap-2">
              <span className="h-1 flex-1 rounded-full bg-orange-400" />
              <span className="h-1 flex-1 rounded-full bg-white/40" />
            </div>
          </section>

          <FormSection
            icon={FileText}
            title="البيانات الأساسية"
            hint="العنوان والوصف يظهران في بطاقة الكورس."
          >
            <Field label="عنوان الكورس" required>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={fieldClassName}
                placeholder="مثال: مادة القدرات - المستوى المتوسط"
              />
            </Field>
            <Field label="الوصف (اختياري)">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className={`${fieldClassName} min-h-28 resize-y leading-6`}
                placeholder="نبذة تسويقية قصيرة: ماذا يكتسب الطالب؟"
              />
            </Field>
          </FormSection>

          <FormSection
            icon={isEdit ? Filter : WalletCards}
            title={isEdit ? 'التصنيف' : 'السعر والتصنيف'}
            hint="نوع الكورس يحدد قواعد الربط مع المستوى في النظام."
          >
            {!isEdit && (
              <Field label="السعر" required>
                <div className="flex overflow-hidden rounded-2xl border border-blue-500/20 bg-white dark:bg-zinc-950">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="min-w-0 flex-1 bg-transparent px-4 py-3 text-right text-lg font-bold outline-none dark:text-zinc-100"
                    placeholder="0"
                  />
                  <span className="flex items-center border-s border-blue-500/20 bg-blue-50 px-4 text-sm font-black text-blue-600 dark:bg-blue-950/40">
                    ر.س
                  </span>
                </div>
              </Field>
            )}

            <div>
              <p className="mb-2 text-right text-sm font-bold text-zinc-600 dark:text-zinc-300">
                نوع الكورس <span className="text-orange-500">*</span>
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <TypeTile
                  active={courseType === 'qdrat'}
                  accent="blue"
                  icon={BarChart3}
                  title="قدرات"
                  subtitle="مرتبط بمستوى تحديد المستوى"
                  onClick={() => {
                    setCourseType('qdrat');
                    if (!placementLevelId && levels.length > 0) {
                      setPlacementLevelId(String(levels[0].id));
                    }
                  }}
                />
                <TypeTile
                  active={courseType === 'tahseeli'}
                  accent="orange"
                  icon={School}
                  title="تحصيلي"
                  subtitle="مسار مستقل بدون مستوى placement"
                  onClick={() => {
                    setCourseType('tahseeli');
                    setPlacementLevelId('');
                  }}
                />
              </div>
            </div>

            {courseType === 'qdrat' ? (
              <Field label="مستوى الطالب (placement)" required>
                <div className="flex items-center gap-3 rounded-2xl border border-blue-500/25 bg-white px-4 py-3 dark:bg-zinc-950">
                  <Layers className="h-5 w-5 text-blue-500" />
                  <select
                    value={placementLevelId}
                    onChange={(e) => setPlacementLevelId(e.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-right text-sm font-bold outline-none dark:text-zinc-100"
                    disabled={levelsLoading || levels.length === 0}
                  >
                    <option value="">
                      {levelsLoading ? 'جاري تحميل المستويات...' : 'اختر المستوى'}
                    </option>
                    {levels.map((level) => (
                      <option key={level.id} value={level.id}>
                        {level.name}
                      </option>
                    ))}
                  </select>
                  <ChevronLeft className="h-5 w-5 text-zinc-400" />
                </div>
                <p className="mt-2 text-right text-xs text-zinc-500">
                  المختار الآن: {selectedLevelName}
                </p>
              </Field>
            ) : (
              <div className="flex items-start gap-3 rounded-2xl border border-orange-500/30 bg-orange-50 px-4 py-3 text-right dark:bg-orange-950/20">
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" />
                <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">
                  مسار التحصيلي لا يُربط بمستوى تحديد؛ يُخزَّن المستوى فارغاً في
                  الخادم وفق التوثيق.
                </p>
              </div>
            )}
          </FormSection>

          <FormSection
            icon={ImageIcon}
            title="الغلاف البصري"
            hint="نسبة تقريبية 16:9 تناسب العرض في القوائم والرئيسية."
          >
            {previewUrl ? (
              <div className="relative h-52 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-950 dark:border-zinc-700">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="غلاف الكورس"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 flex justify-end gap-2 bg-gradient-to-t from-black/70 to-transparent p-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-blue-500 px-3 py-2 text-sm font-black text-white transition hover:bg-blue-600">
                    <Camera className="h-4 w-4" />
                    تغيير
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => chooseImage(e.target.files?.[0] ?? null)}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={clearCourseImage}
                    className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-3 py-2 text-sm font-black text-white transition hover:bg-orange-600"
                  >
                    <Trash2 className="h-4 w-4" />
                    حذف
                  </button>
                </div>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-500/50 bg-blue-50/50 px-5 py-8 text-center transition hover:bg-blue-50 dark:bg-blue-950/10 dark:hover:bg-blue-950/20">
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500">
                  <UploadCloud className="h-9 w-9" />
                </span>
                <span className="mt-3 text-base font-black text-zinc-900 dark:text-white">
                  اضغط لرفع غلاف الكورس
                </span>
                <span className="mt-1 text-sm text-zinc-500">
                  من الجهاز أو الصق رابطاً مباشراً بالأسفل
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => chooseImage(e.target.files?.[0] ?? null)}
                />
              </label>
            )}

            <Field label="رابط الصورة (اختياري)">
              <input
                value={imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value);
                  chooseImage(null);
                  setClearImage(false);
                }}
                className={fieldClassName}
                placeholder="https://..."
                dir="ltr"
              />
            </Field>
            <p className="text-right text-xs leading-5 text-zinc-500">
              عند اختيار ملف من الجهاز يُرسل مع الطلب؛ إن وُجد الملف يُفضّل على
              الرابط حسب إعدادات الخادم.
            </p>

            {isEdit && (imageUrl || filePreviewUrl || clearImage) && (
              <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm dark:border-zinc-700 dark:bg-zinc-950">
                <input
                  type="checkbox"
                  checked={clearImage}
                  onChange={(e) => {
                    if (e.target.checked) {
                      clearCourseImage();
                    } else {
                      setClearImage(false);
                      setImageUrl(course?.image_url ?? '');
                    }
                  }}
                />
                <span className="font-medium text-zinc-700 dark:text-zinc-200">
                  مسح صورة الكورس الحالية بإرسال <code>image_url: null</code>
                </span>
              </label>
            )}
          </FormSection>

          {err && (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
              {err}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-500 px-5 py-4 text-base font-black text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-600 disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {busy ? 'جاري الحفظ...' : isEdit ? 'حفظ التعديلات' : 'إنشاء الكورس'}
          </button>
        </form>
      </div>
    </div>
  );
}

const fieldClassName =
  'w-full rounded-2xl border border-blue-500/20 bg-white px-4 py-3 text-right text-sm outline-none transition placeholder:text-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:bg-zinc-950 dark:text-zinc-100';

function FormSection({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon: typeof BookOpen;
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-zinc-200 border-s-blue-500/50 border-s-4 bg-white p-5 shadow-sm dark:border-zinc-800 dark:border-s-blue-500/60 dark:bg-zinc-900">
      <div className="mb-5 flex flex-row-reverse items-start gap-3 border-b border-blue-500/10 pb-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-blue-500">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1 text-right">
          <h3 className="text-lg font-black text-zinc-950 dark:text-white">
            {title}
          </h3>
          <p className="mt-1 text-xs leading-5 text-zinc-500">{hint}</p>
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function TypeTile({
  active,
  accent,
  icon: Icon,
  title,
  subtitle,
  onClick,
}: {
  active: boolean;
  accent: 'blue' | 'orange';
  icon: typeof BookOpen;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  const activeClasses =
    accent === 'blue'
      ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-950/30'
      : 'border-orange-500 bg-orange-50 text-orange-600 dark:bg-orange-950/30';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border-2 p-4 text-right transition hover:shadow-sm ${
        active
          ? activeClasses
          : 'border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950'
      }`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            active ? 'bg-current/10' : 'bg-zinc-200/60 dark:bg-zinc-800'
          }`}
        >
          <Icon className="h-5 w-5" />
        </span>
        {active ? (
          <CheckCircle2 className="h-6 w-6" />
        ) : (
          <span className="h-6 w-6 rounded-full border-2 border-zinc-300 dark:border-zinc-600" />
        )}
      </div>
      <p className="mt-3 text-base font-black text-zinc-950 dark:text-white">
        {title}
      </p>
      <p className="mt-1 text-xs leading-5 text-zinc-500">{subtitle}</p>
    </button>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-right">
      <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200">
        {label}
        {required && <span className="text-orange-500"> *</span>}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
