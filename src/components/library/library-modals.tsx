'use client';

import { ArrowDown, ArrowUp, CheckCircle2, Circle, ImagePlus, Trash2, UploadCloud, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiErr } from '@/lib/library-errors';
import * as ql from '@/lib/question-library-api';
import type { Course, Lesson, OptionKey, QuestionListItem } from '@/types/question-library';
import { OPTION_KEYS } from '@/types/question-library';

export type ModalState =
  | { type: 'none' }
  | { type: 'course'; mode: 'create' | 'edit'; course?: Course }
  | { type: 'lesson'; mode: 'create' | 'edit'; lesson?: Lesson }
  | { type: 'mcq'; lessonId: number }
  | { type: 'bulk'; lessonId: number }
  | { type: 'options'; question: QuestionListItem };

export function ModalBackdrop({
  children,
  onClose,
  title,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
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
        aria-label="إغلاق"
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900 md:p-8">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function CourseModal({
  state,
  onClose,
  onSaved,
}: {
  state: Extract<ModalState, { type: 'course' }>;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [title, setTitle] = useState(state.course?.title ?? '');
  const [description, setDescription] = useState(
    state.course?.description ?? ''
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!title.trim()) {
      setErr('العنوان مطلوب');
      return;
    }
    setBusy(true);
    try {
      if (state.mode === 'create') {
        await ql.createCourse({
          title: title.trim(),
          description: description.trim() || undefined,
        });
      } else if (state.course) {
        await ql.updateCourse(state.course.id, {
          title: title.trim(),
          description: description.trim() || undefined,
        });
      }
      await onSaved();
    } catch (e) {
      setErr(apiErr(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalBackdrop
      title={state.mode === 'create' ? 'دورة جديدة' : 'تعديل الدورة'}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            العنوان
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            الوصف
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950"
          />
        </div>
        {err && (
          <p className="text-sm text-red-600 dark:text-red-400">{err}</p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-indigo-600 py-2.5 font-medium text-white disabled:opacity-60"
        >
          {busy ? 'جاري الحفظ…' : 'حفظ'}
        </button>
      </form>
    </ModalBackdrop>
  );
}

export function LessonModal({
  courseId,
  state,
  onClose,
  onSaved,
}: {
  courseId: number;
  state: Extract<ModalState, { type: 'lesson' }>;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [title, setTitle] = useState(state.lesson?.title ?? '');
  const [description, setDescription] = useState(
    state.lesson?.description ?? ''
  );
  const [position, setPosition] = useState(
    state.lesson?.position != null ? String(state.lesson.position) : ''
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!title.trim()) {
      setErr('عنوان الدرس مطلوب');
      return;
    }
    setBusy(true);
    try {
      const pos = position.trim() ? parseInt(position, 10) : undefined;
      if (position.trim() && (Number.isNaN(pos) || pos! < 1)) {
        setErr('الترتيب يجب أن يكون رقمًا موجبًا');
        setBusy(false);
        return;
      }
      if (state.mode === 'create') {
        await ql.createLesson(courseId, {
          title: title.trim(),
          description: description.trim() || undefined,
          position: pos,
        });
      } else if (state.lesson) {
        await ql.updateLesson(state.lesson.id, {
          title: title.trim(),
          description: description.trim() || undefined,
          position: pos,
        });
      }
      await onSaved();
    } catch (e) {
      setErr(apiErr(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalBackdrop
      title={state.mode === 'create' ? 'درس جديد' : 'تعديل الدرس'}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="text-sm font-medium">العنوان</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950"
          />
        </div>
        <div>
          <label className="text-sm font-medium">الوصف</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950"
          />
        </div>
        <div>
          <label className="text-sm font-medium">الترتيب (اختياري)</label>
          <input
            type="number"
            min={1}
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950"
          />
        </div>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-indigo-600 py-2.5 font-medium text-white"
        >
          {busy ? 'جاري الحفظ…' : 'حفظ'}
        </button>
      </form>
    </ModalBackdrop>
  );
}

export function McqModal({
  lessonId,
  onClose,
  onSaved,
}: {
  lessonId: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  return (
    <ModalBackdrop title="سؤال MCQ نصي" onClose={onClose}>
      <McqFormBody lessonId={lessonId} onDone={onSaved} />
    </ModalBackdrop>
  );
}

export function McqFormBody({
  lessonId,
  onDone,
}: {
  lessonId: number;
  onDone: () => Promise<void>;
}) {
  const [prompt, setPrompt] = useState('');
  const [opts, setOpts] = useState<Record<OptionKey, string>>({
    A: '',
    B: '',
    C: '',
    D: '',
  });
  const [correct, setCorrect] = useState<OptionKey>('A');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!prompt.trim()) {
      setErr('نص السؤال مطلوب');
      return;
    }
    for (const k of OPTION_KEYS) {
      if (!opts[k].trim()) {
        setErr(`الخيار ${k} مطلوب`);
        return;
      }
    }
    setBusy(true);
    try {
      await ql.createMcqQuestion(lessonId, {
        prompt_text: prompt.trim(),
        options: OPTION_KEYS.map((option_key) => ({
          option_key,
          option_text: opts[option_key].trim(),
        })),
        correct_option_key: correct,
      });
      setPrompt('');
      setOpts({ A: '', B: '', C: '', D: '' });
      setCorrect('A');
      await onDone();
    } catch (e) {
      setErr(apiErr(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">نص السؤال</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950"
        />
      </div>
      {OPTION_KEYS.map((k) => (
        <div key={k}>
          <label className="text-sm font-medium">الخيار {k}</label>
          <input
            value={opts[k]}
            onChange={(e) =>
              setOpts((o) => ({ ...o, [k]: e.target.value }))
            }
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950"
          />
        </div>
      ))}
      <div>
        <label className="text-sm font-medium">الإجابة الصحيحة</label>
        <select
          value={correct}
          onChange={(e) => setCorrect(e.target.value as OptionKey)}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950"
        >
          {OPTION_KEYS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-xl bg-indigo-600 py-2.5 font-medium text-white"
      >
        {busy ? 'جاري الإنشاء…' : 'إنشاء السؤال'}
      </button>
    </form>
  );
}

export function BulkModal({
  lessonId,
  onClose,
  onSaved,
}: {
  lessonId: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  return (
    <ModalBackdrop title="رفع صور الأسئلة (مجموعة)" onClose={onClose}>
      <BulkFormBody lessonId={lessonId} onDone={onSaved} />
    </ModalBackdrop>
  );
}

export function BulkFormBody({
  lessonId,
  onDone,
}: {
  lessonId: number;
  onDone: () => Promise<void>;
}) {
  const [files, setFiles] = useState<
    { id: string; file: File; previewUrl: string }[]
  >([]);
  const [metaPrompt, setMetaPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      for (const f of files) URL.revokeObjectURL(f.previewUrl);
    };
    // تنظيف نهائي فقط عند إزالة المكون
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onPickFiles(nextFiles: FileList | null) {
    if (!nextFiles?.length) return;
    const sorted = Array.from(nextFiles).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    );
    const incoming = sorted.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
      previewUrl: URL.createObjectURL(file),
      file,
    }));
    setFiles((prev) => [...prev, ...incoming]);
  }

  function moveFile(index: number, direction: 'up' | 'down') {
    setFiles((prev) => {
      const next = [...prev];
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function removeFile(id: string) {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  }

  function clearFiles() {
    setFiles((prev) => {
      for (const f of prev) URL.revokeObjectURL(f.previewUrl);
      return [];
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!files.length) {
      setErr('اختر صورة واحدة على الأقل');
      return;
    }
    const arr = files.map((x) => x.file);
    setBusy(true);
    try {
      await ql.bulkUploadQuestionImages(
        lessonId,
        arr,
        metaPrompt.trim() ? { prompt_text: metaPrompt.trim() } : undefined
      );
      clearFiles();
      setMetaPrompt('');
      await onDone();
    } catch (e) {
      setErr(apiErr(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <p className="rounded-xl bg-violet-50 px-4 py-3 text-sm text-violet-900 dark:bg-violet-950/30 dark:text-violet-100">
        كل صورة تُنشئ سؤالًا مستقلًا. الحد الأقصى للصورة 5MB حسب الخادم.
      </p>
      <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/60 p-4 dark:border-zinc-700 dark:bg-zinc-900/40">
        <label className="text-sm font-medium">صور (متعدد)</label>
        <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800">
          <UploadCloud className="h-4 w-4" />
          اختر الصور
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => onPickFiles(e.target.files)}
            className="hidden"
          />
        </label>
        <p className="mt-2 text-xs text-zinc-500">
          يمكنك اختيار الصور على دفعات، وستظهر هنا قبل الرفع.
        </p>
      </div>

      {files.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              الصور المختارة ({files.length})
            </p>
            <button
              type="button"
              onClick={clearFiles}
              className="text-xs text-red-600 underline"
            >
              مسح الكل
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {files.map((item, idx) => (
              <div
                key={item.id}
                className="group relative overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
              >
                <span className="absolute start-2 top-2 z-10 flex h-6 min-w-6 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-xs font-bold text-white shadow">
                  {idx + 1}
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.previewUrl}
                  alt={item.file.name}
                  className="h-28 w-full object-cover"
                />
                <div className="flex items-center justify-between gap-1 p-2">
                  <p className="min-w-0 flex-1 truncate text-xs text-zinc-600 dark:text-zinc-400">
                    {item.file.name}
                  </p>
                  <div className="flex shrink-0 gap-0.5">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveFile(idx, 'up')}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
                      aria-label="تقديم"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === files.length - 1}
                      onClick={() => moveFile(idx, 'down')}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
                      aria-label="تأخير"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(item.id)}
                  className="absolute end-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition group-hover:opacity-100"
                  aria-label="إزالة الصورة"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="text-sm font-medium">
          نص افتراضي اختياري (meta)
        </label>
        <input
          value={metaPrompt}
          onChange={(e) => setMetaPrompt(e.target.value)}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-600 dark:bg-zinc-950"
        />
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <button
        type="submit"
        disabled={busy}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 font-medium text-white disabled:opacity-60"
      >
        <ImagePlus className="h-4 w-4" />
        {busy ? 'جاري الرفع…' : 'رفع الصور'}
      </button>
    </form>
  );
}

/** POST .../lessons/:lessonId/questions/bulk-arabic-text */
export function ArabicBulkFormBody({
  lessonId,
  onDone,
}: {
  lessonId: number;
  onDone: () => Promise<void>;
}) {
  const [text, setText] = useState('');
  const [oncePerLesson, setOncePerLesson] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSuccess(null);
    if (!text.trim()) {
      setErr('النص مطلوب');
      return;
    }
    setBusy(true);
    try {
      const res = await ql.bulkArabicTextQuestions(lessonId, {
        text: text.trim(),
        ...(oncePerLesson ? { once_per_lesson: true } : {}),
      });
      setSuccess(
        `تم إنشاء ${res.count} سؤالًا. بعد الاستيراد لا توجد إجابة صحيحة بعد — عدّل الخيارات من قائمة الأسئلة أدناه.`
      );
      setText('');
      await onDone();
    } catch (e) {
      setErr(apiErr(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
        الصيغة: رقم ثم شرطة ثم نص السؤال، ثم{' '}
        <strong className="font-mono">أ)</strong> <strong className="font-mono">ب)</strong>{' '}
        <strong className="font-mono">ج)</strong> <strong className="font-mono">د)</strong>{' '}
        لكل سؤال. عدة أسئلة في نفس النص (مثال:{' '}
        <span dir="ltr" className="text-xs opacity-90">
          1- السؤال…أ) …ب) …2- السؤال…
        </span>
        ).
      </p>
      <div>
        <label className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
          النص الكامل
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={12}
          dir="rtl"
          placeholder={`مثال:\n1- ما عاصمة مصر؟\nأ) القاهرة\nب) الإسكندرية\nج) أسوان\nد) الأقصر\n2- …`}
          className="mt-1 w-full rounded-xl border border-zinc-300 px-4 py-3 font-mono text-sm leading-relaxed dark:border-zinc-600 dark:bg-zinc-950"
        />
      </div>
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900/50">
        <input
          type="checkbox"
          checked={oncePerLesson}
          onChange={(e) => setOncePerLesson(e.target.checked)}
          className="mt-1"
        />
        <span className="text-sm text-zinc-700 dark:text-zinc-300">
          <strong>مرة واحدة لكل درس</strong> (
          <code className="rounded bg-zinc-200 px-1 text-xs dark:bg-zinc-800">
            once_per_lesson
          </code>
          ): إن كان الدرس يحتوي أسئلة مسبقًا يُرفض الطلب (
          <strong>409</strong>) ولا يُنشأ شيء.
        </span>
      </label>
      {success && (
        <p
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100"
          role="status"
        >
          {success}
        </p>
      )}
      {err && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          {err}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-xl bg-teal-700 py-3 font-semibold text-white shadow-lg transition hover:bg-teal-800 disabled:opacity-60 dark:bg-teal-600 dark:hover:bg-teal-700"
      >
        {busy ? 'جاري الاستيراد…' : 'استيراد الأسئلة'}
      </button>
    </form>
  );
}

export function OptionsModal({
  question,
  onClose,
  onSaved,
}: {
  question: QuestionListItem;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const initial = question.options.reduce(
    (acc, o) => {
      acc[o.option_key as OptionKey] = o.option_text;
      return acc;
    },
    {} as Record<OptionKey, string>
  );
  const [opts, setOpts] = useState<Record<OptionKey, string>>({
    A: initial.A ?? '',
    B: initial.B ?? '',
    C: initial.C ?? '',
    D: initial.D ?? '',
  });
  const [correct, setCorrect] = useState<OptionKey>(() => {
    const found = question.options.find((o) => o.is_correct);
    return (found?.option_key as OptionKey) ?? 'A';
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    for (const k of OPTION_KEYS) {
      if (!opts[k].trim()) {
        setErr(`الخيار ${k} مطلوب`);
        return;
      }
    }
    setBusy(true);
    try {
      await ql.putQuestionOptions(question.question_id, {
        options: OPTION_KEYS.map((option_key) => ({
          option_key,
          option_text: opts[option_key].trim(),
        })),
        correct_option_key: correct,
      });
      await onSaved();
    } catch (e) {
      setErr(apiErr(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalBackdrop title="تعديل الخيارات وتحديد الإجابة الصحيحة" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-900 dark:border-indigo-900/40 dark:bg-indigo-950/30 dark:text-indigo-100">
          <p>
            سيتم إرسال الطلب بصيغة
            <code className="mx-1 rounded bg-indigo-200/70 px-1 py-0.5 text-xs dark:bg-indigo-900/60">
              PUT /questions/:questionId/options
            </code>
            مع 4 اختيارات بالضبط + <strong>correct_option_key</strong>.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {OPTION_KEYS.map((k) => {
            const active = correct === k;
            return (
              <div
                key={k}
                className={`rounded-xl border p-3 transition ${
                  active
                    ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30'
                    : 'border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setCorrect(k)}
                  className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-zinc-800 dark:text-zinc-100"
                >
                  {active ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Circle className="h-4 w-4 text-zinc-400" />
                  )}
                  الخيار {k}
                  {active && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200">
                      الإجابة الصحيحة
                    </span>
                  )}
                </button>
                <input
                  value={opts[k]}
                  onChange={(e) =>
                    setOpts((o) => ({ ...o, [k]: e.target.value }))
                  }
                  placeholder={`اكتب نص الاختيار ${k}`}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
                />
              </div>
            );
          })}
        </div>

        {err && <p className="text-sm text-red-600">{err}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white disabled:opacity-60"
        >
          {busy ? 'جاري الحفظ…' : 'حفظ'}
        </button>
      </form>
    </ModalBackdrop>
  );
}
