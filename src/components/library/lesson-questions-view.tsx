'use client';

import {
  CheckCircle2,
  ChevronRight,
  Circle,
  Expand,
  FileText,
  HelpCircle,
  ImagePlus,
  Import,
  LayoutGrid,
  Loader2,
  ListChecks,
  Pencil,
  PlusCircle,
  ScrollText,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import katex from 'katex';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  ArabicBulkFormBody,
  BulkFormBody,
  McqFormBody,
  ModalBackdrop,
  OptionsModal,
  type ModalState,
} from '@/components/library/library-modals';
import { ImportSelectedQuestionsModal } from '@/components/library/import-selected-questions-modal';
import { apiErr } from '@/lib/library-errors';
import {
  extractQuestionsFromFile,
  type OcrExtractedQuestion,
} from '@/lib/ocr-api';
import * as ql from '@/lib/question-library-api';
import type { OptionKey, QuestionListItem } from '@/types/question-library';
import { OPTION_KEYS } from '@/types/question-library';

type AddTab = 'mcq' | 'bulk' | 'arabic';

type MathPart =
  | { type: 'text'; value: string }
  | { type: 'math'; value: string; displayMode: boolean };

const ARABIC_OPTION_KEYS: Record<string, OptionKey> = {
  أ: 'A',
  ا: 'A',
  ب: 'B',
  ج: 'C',
  د: 'D',
};

const ARABIC_MATH_LETTERS = /[\u0621-\u064A]+/g;

function normalizeMathForKatex(value: string) {
  return value
    .replace(/٪/g, '\\%')
    .replace(/(^|[^\\])%/g, '$1\\%')
    .replace(/×/g, '\\times ')
    .replace(/÷/g, '\\div ')
    .replace(ARABIC_MATH_LETTERS, (letters) => `\\text{${letters}}`);
}

function splitMathText(text: string): MathPart[] {
  const parts: MathPart[] = [];
  const re = /(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\\\([\s\S]+?\\\)|\\\[[\s\S]+?\\\])/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }

    const raw = match[0];
    const displayMode = raw.startsWith('$$') || raw.startsWith('\\[');
    const value = raw.startsWith('$$')
      ? raw.slice(2, -2)
      : raw.startsWith('$')
      ? raw.slice(1, -1)
      : raw.startsWith('\\[')
      ? raw.slice(2, -2)
      : raw.slice(2, -2);

    parts.push({ type: 'math', value, displayMode });
    lastIndex = match.index + raw.length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return parts.length ? parts : [{ type: 'text', value: text }];
}

function renderMath(value: string, displayMode: boolean) {
  try {
    return katex.renderToString(normalizeMathForKatex(value), {
      displayMode,
      output: 'html',
      strict: 'ignore',
      throwOnError: false,
      trust: false,
    });
  } catch {
    return null;
  }
}

function MathText({
  text,
  fallback,
}: {
  text: string | null | undefined;
  fallback?: React.ReactNode;
}) {
  const trimmed = text?.trim();
  if (!trimmed) return <>{fallback ?? null}</>;

  return (
    <span dir="auto" style={{ unicodeBidi: 'plaintext' }}>
      {splitMathText(trimmed).map((part, index) => {
        if (part.type === 'text') {
          return (
            <span key={index} className="whitespace-pre-wrap">
              {part.value}
            </span>
          );
        }

        const html = renderMath(part.value, part.displayMode);
        if (!html) {
          return (
            <span key={index} className="font-mono">
              {part.value}
            </span>
          );
        }

        return (
          <span
            key={index}
            dir="ltr"
            className={
              part.displayMode
                ? 'my-2 block overflow-x-auto'
                : 'inline-block align-middle'
            }
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      })}
    </span>
  );
}

function optionKeyFromLabel(label: string, index: number): OptionKey | null {
  const normalized = label.trim().replace(/[).:،]/g, '');
  if (OPTION_KEYS.includes(normalized as OptionKey)) {
    return normalized as OptionKey;
  }
  return ARABIC_OPTION_KEYS[normalized] ?? OPTION_KEYS[index] ?? null;
}

function correctKeyFromQuestion(question: OcrExtractedQuestion): OptionKey | null {
  const byIndex = question.correct_answer_index;
  if (
    byIndex != null &&
    Number.isInteger(byIndex) &&
    byIndex >= 0 &&
    byIndex < OPTION_KEYS.length
  ) {
    return OPTION_KEYS[byIndex];
  }

  const correct = question.correct_answer?.trim();
  if (!correct) return null;

  const direct = optionKeyFromLabel(correct, -1);
  if (direct) return direct;

  const optionIndex = question.options.findIndex(
    (option) =>
      option.label?.trim() === correct || option.text.trim() === correct
  );
  return optionIndex >= 0 ? OPTION_KEYS[optionIndex] : null;
}

function normalizeOcrOptions(question: OcrExtractedQuestion) {
  return OPTION_KEYS.map((option_key, index) => {
    const found =
      question.options.find(
        (option, optionIndex) =>
          optionKeyFromLabel(option.label ?? '', optionIndex) === option_key
      ) ?? question.options[index];

    return {
      option_key,
      option_text: found?.text.trim() ?? '',
    };
  });
}

function buildPromptText(question: OcrExtractedQuestion) {
  const prompt = question.question_text.trim();
  const imageLines = (question.question_images ?? [])
    .filter((image) => image.image_blob)
    .slice(1)
    .map(
      (image, index) =>
        `صورة إضافية ${index + 1}: ${image.short_description ?? 'صورة مرتبطة بالسؤال'}`
    );

  return imageLines.length
    ? `${prompt}\n\n${imageLines.join('\n')}`
    : prompt;
}

function primaryQuestionImage(question: OcrExtractedQuestion) {
  return question.question_images?.find((image) => image.image_blob);
}

function questionImageSrc(question: QuestionListItem) {
  return question.question_image_blob || question.question_image_url;
}

function isPdfFile(file: File | null) {
  if (!file) return false;
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

function isImageFile(file: File) {
  return (
    file.type.startsWith('image/') ||
    /\.(png|jpe?g|webp|gif|avif|bmp|tiff?)$/i.test(file.name)
  );
}

function selectedFilesLabel(files: File[]) {
  if (files.length === 0) return 'اختر PDF واحد أو حتى 8 صور من الجهاز';
  if (files.length === 1) return files[0].name;
  return `${files.length} صور مختارة: ${files.map((file) => file.name).join('، ')}`;
}

export function LessonQuestionsView() {
  const params = useParams();
  const searchParams = useSearchParams();
  const lessonId = Number(params.lessonId);
  const courseId = Number(searchParams.get('courseId'));

  const [courseTitle, setCourseTitle] = useState('');
  const [lessonTitle, setLessonTitle] = useState('');
  const [questions, setQuestions] = useState<QuestionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ type: 'none' });
  const [addTab, setAddTab] = useState<AddTab>('mcq');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  const [isExamImportOpen, setIsExamImportOpen] = useState(false);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<number[]>([]);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  /** أسئلة قيد حفظ الإجابة الصحيحة — يعطّل أزرار ذلك السؤال فقط */
  const [savingAnswerByQuestion, setSavingAnswerByQuestion] = useState<
    Record<number, true>
  >({});
  /** الاختيار الذي ضغطه المستخدم أثناء انتظار الطلب (تمييز لوني) */
  const [pendingCorrectKey, setPendingCorrectKey] = useState<
    Partial<Record<number, OptionKey>>
  >({});

  /** تحديث قائمة الأسئلة بدون إظهار شاشة تحميل كاملة */
  async function refreshQuestionsQuiet() {
    if (!Number.isFinite(lessonId) || !Number.isFinite(courseId)) return;
    try {
      const list = await ql.fetchQuestions({
        lesson_id: lessonId,
        course_id: courseId,
      });
      setQuestions(list);
    } catch (e) {
      setBanner(apiErr(e));
    }
  }

  function applyCorrectLocally(questionId: number, correctKey: OptionKey) {
    setQuestions((prev) =>
      prev.map((q) =>
        q.question_id !== questionId
          ? q
          : {
              ...q,
              options: q.options.map((o) => ({
                ...o,
                is_correct: o.option_key === correctKey,
              })),
            }
      )
    );
  }

  function toggleSelectedQuestion(questionId: number) {
    setSelectedQuestionIds((prev) =>
      prev.includes(questionId)
        ? prev.filter((id) => id !== questionId)
        : [...prev, questionId]
    );
  }

  function clearSelectedQuestions() {
    setSelectedQuestionIds([]);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!Number.isFinite(lessonId) || !Number.isFinite(courseId)) {
        if (!cancelled) {
          setBanner(
            'يجب فتح هذه الصفحة من الدورة مع معامل courseId في الرابط.'
          );
          setLoading(false);
        }
        return;
      }
      try {
        const lessons = await ql.fetchLessons(courseId);
        const lesson = lessons.find((l) => l.id === lessonId);
        if (!lesson) {
          if (!cancelled) {
            setBanner('الدرس غير موجود ضمن هذه الدورة.');
            setQuestions([]);
            setLessonTitle('');
            setCourseTitle('');
          }
          return;
        }
        const courses = await ql.fetchCourses();
        const course = courses.find((c) => c.id === courseId);
        const list = await ql.fetchQuestions({
          lesson_id: lessonId,
          course_id: courseId,
        });
        if (cancelled) return;
        setLessonTitle(lesson.title);
        setCourseTitle(course?.title ?? '');
        setQuestions(list);
        setBanner(null);
      } catch (e) {
        if (!cancelled) {
          setBanner(apiErr(e));
          setQuestions([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lessonId, courseId]);

  useEffect(() => {
    setSelectedQuestionIds((prev) =>
      prev.filter((id) => questions.some((question) => question.question_id === id))
    );
  }, [questions]);

  async function afterMutation() {
    await refreshQuestionsQuiet();
    try {
      await ql.fetchLessons(courseId);
    } catch {
      /* ignore refresh helper */
    }
  }

  const invalidIds =
    !Number.isFinite(lessonId) || !Number.isFinite(courseId);

  async function setCorrectAnswerInline(
    question: QuestionListItem,
    correctKey: OptionKey
  ) {
    /** أسئلة الصور غالبًا تُنشأ بخيارات نصية فارغة؛ الـ API يرفض النص الفارغ فيسبب الخادم أخطاء تحقق */
    const normalized = (['A', 'B', 'C', 'D'] as const).map((key) => {
      const found = question.options.find((o) => o.option_key === key);
      const raw = found?.option_text?.trim() ?? '';
      return {
        option_key: key,
        option_text: raw || `خيار ${key}`,
      };
    });

    const qid = question.question_id;
    setSavingAnswerByQuestion((prev) => ({ ...prev, [qid]: true }));
    setPendingCorrectKey((prev) => ({ ...prev, [qid]: correctKey }));
    try {
      await ql.putQuestionOptions(qid, {
        options: normalized,
        correct_option_key: correctKey,
      });
      applyCorrectLocally(qid, correctKey);
      await refreshQuestionsQuiet();
      setBanner(null);
    } catch (e) {
      setBanner(apiErr(e));
    } finally {
      setSavingAnswerByQuestion((prev) => {
        const next = { ...prev };
        delete next[qid];
        return next;
      });
      setPendingCorrectKey((prev) => {
        const next = { ...prev };
        delete next[qid];
        return next;
      });
    }
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
        <Link
          href={`/library/courses/${courseId}`}
          className="hover:text-indigo-600 dark:hover:text-indigo-400"
        >
          {courseTitle || 'الدورة'}
        </Link>
        <ChevronRight className="h-4 w-4 opacity-60" />
        <span className="font-medium text-zinc-800 dark:text-zinc-200">
          {lessonTitle || 'الدرس'}
        </span>
      </nav>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white md:text-3xl">
            أسئلة الدرس
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200">
              <ListChecks className="h-3.5 w-3.5" />
              GET /questions
            </span>
            {lessonTitle && (
              <>
                <span className="hidden sm:inline">·</span>
                <span>{lessonTitle}</span>
              </>
            )}
          </p>
        </div>
        <Link
          href={`/library/courses/${courseId}`}
          className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
        >
          العودة للدروس
        </Link>
      </div>

      {!invalidIds && (
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setIsOcrModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-700"
          >
            <FileText className="h-4 w-4" />
            استخراج من PDF/صورة
          </button>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-700"
          >
            <PlusCircle className="h-4 w-4" />
            إضافة أسئلة
          </button>
          <button
            type="button"
            onClick={() => setIsExamImportOpen(true)}
            disabled={selectedQuestionIds.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Import className="h-4 w-4" />
            إضافة المحدد لامتحان
            {selectedQuestionIds.length > 0 && (
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
                {selectedQuestionIds.length}
              </span>
            )}
          </button>
        </div>
      )}

      {banner && (
        <div
          className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          {banner}
        </div>
      )}
      {success && (
        <div
          className="mt-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100"
          role="status"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}

      {isOcrModalOpen && !invalidIds && (
        <OcrImportModal
          lessonId={lessonId}
          onClose={() => setIsOcrModalOpen(false)}
          onDone={async () => {
            await afterMutation();
            setIsOcrModalOpen(false);
          }}
        />
      )}

      {isAddModalOpen && !invalidIds && (
        <ModalBackdrop title="إضافة أسئلة للدرس" onClose={() => setIsAddModalOpen(false)}>
          <section className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-xl shadow-zinc-900/5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-100 bg-gradient-to-l from-indigo-50/90 to-white px-6 py-5 dark:border-zinc-800 dark:from-indigo-950/40 dark:to-zinc-900">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg">
                  <HelpCircle className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                    إضافة أسئلة
                  </h2>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    MCQ يدوي، رفع صور، أو استيراد نص عربي مجمّع (
                    <code className="rounded bg-zinc-200/80 px-1 text-xs dark:bg-zinc-800">
                      bulk-arabic-text
                    </code>
                    ).
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-2 rounded-2xl bg-zinc-100/80 p-1 sm:grid-cols-3 dark:bg-zinc-950/80">
              <button
                type="button"
                onClick={() => setAddTab('mcq')}
                className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  addTab === 'mcq'
                    ? 'bg-white text-indigo-900 shadow-md dark:bg-zinc-800 dark:text-white'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400'
                }`}
              >
                <LayoutGrid className="h-4 w-4 shrink-0" />
                سؤال MCQ نصي
              </button>
              <button
                type="button"
                onClick={() => setAddTab('bulk')}
                className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  addTab === 'bulk'
                    ? 'bg-white text-violet-900 shadow-md dark:bg-zinc-800 dark:text-white'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400'
                }`}
              >
                <ImagePlus className="h-4 w-4 shrink-0" />
                رفع صور
              </button>
              <button
                type="button"
                onClick={() => setAddTab('arabic')}
                className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  addTab === 'arabic'
                    ? 'bg-white text-teal-900 shadow-md dark:bg-zinc-800 dark:text-white'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400'
                }`}
              >
                <ScrollText className="h-4 w-4 shrink-0" />
                نص عربي مجمّع
              </button>
            </div>
          </div>
          <div className="p-6 md:p-8">
            {addTab === 'mcq' && (
              <McqFormBody
                lessonId={lessonId}
                onDone={async () => {
                  await afterMutation();
                  setIsAddModalOpen(false);
                }}
              />
            )}
            {addTab === 'bulk' && (
              <BulkFormBody
                lessonId={lessonId}
                onDone={async () => {
                  await afterMutation();
                  setIsAddModalOpen(false);
                }}
              />
            )}
            {addTab === 'arabic' && (
              <ArabicBulkFormBody
                lessonId={lessonId}
                onDone={async () => {
                  await afterMutation();
                  setIsAddModalOpen(false);
                }}
              />
            )}
          </div>
          </section>
        </ModalBackdrop>
      )}

      {isExamImportOpen && !invalidIds && (
        <ImportSelectedQuestionsModal
          courseId={courseId}
          questionIds={selectedQuestionIds}
          onClose={() => setIsExamImportOpen(false)}
          onImported={(message) => {
            setSuccess(message);
            setBanner(null);
            setIsExamImportOpen(false);
            clearSelectedQuestions();
          }}
        />
      )}

      <section className="mt-12">
        <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-zinc-900 dark:text-white">
          <LayoutGrid className="h-6 w-6 text-indigo-600" />
          قائمة الأسئلة
          {!loading && (
            <span className="rounded-full bg-zinc-100 px-3 py-0.5 text-sm font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              {questions.length}
            </span>
          )}
        </h2>
        {questions.length > 0 && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
              <span className="font-bold text-zinc-900 dark:text-white">
                المحدد: {selectedQuestionIds.length}
              </span>
              <button
                type="button"
                onClick={() => setSelectedQuestionIds(questions.map((q) => q.question_id))}
                className="rounded-lg bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-700 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200"
              >
                تحديد الكل
              </button>
              <button
                type="button"
                onClick={clearSelectedQuestions}
                disabled={selectedQuestionIds.length === 0}
                className="rounded-lg bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-700 transition hover:bg-zinc-200 disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-200"
              >
                إلغاء التحديد
              </button>
            </div>
            <button
              type="button"
              onClick={() => setIsExamImportOpen(true)}
              disabled={selectedQuestionIds.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Import className="h-4 w-4" />
              إضافة المحدد لامتحان
            </button>
          </div>
        )}

        {loading ? (
          <p className="py-16 text-center text-zinc-500">جاري التحميل…</p>
        ) : questions.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-300 bg-zinc-50/50 py-16 text-center dark:border-zinc-700 dark:bg-zinc-900/30">
            <HelpCircle className="mx-auto h-14 w-14 text-zinc-400" />
            <p className="mt-4 font-medium text-zinc-700 dark:text-zinc-300">
              لا أسئلة بعد في هذا الدرس
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              استخدم النموذج أعلاه لإضافة أول سؤال.
            </p>
          </div>
        ) : (
          <div className="grid gap-5">
            {questions.map((q) => {
              const imageSrc = questionImageSrc(q);
              const selected = selectedQuestionIds.includes(q.question_id);

              return (
              <article
                key={q.question_id}
                className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md dark:bg-zinc-900 ${
                  selected
                    ? 'border-blue-400 ring-2 ring-blue-500/20 dark:border-blue-700'
                    : 'border-zinc-200 dark:border-zinc-800'
                }`}
              >
                {imageSrc ? (
                  <button
                    type="button"
                    onClick={() => setPreviewImageUrl(imageSrc)}
                    className="group relative w-full overflow-hidden border-b border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800"
                    aria-label="تكبير صورة السؤال"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageSrc}
                      alt="صورة السؤال"
                      className="max-h-[28rem] w-full object-contain transition-transform duration-200 group-hover:scale-[1.02]"
                    />
                    <span className="absolute inset-x-0 bottom-0 inline-flex items-center justify-center gap-1 bg-black/55 py-1.5 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                      <Expand className="h-3.5 w-3.5" />
                      تكبير
                    </span>
                  </button>
                ) : null}
                <div className="p-5">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <label
                      className={`inline-flex cursor-pointer items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${
                        selected
                          ? 'bg-blue-600 text-white'
                          : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleSelectedQuestion(q.question_id)}
                        className="h-3.5 w-3.5"
                      />
                      اختيار
                    </label>
                    <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-100">
                      #{q.question_id}
                    </span>
                    <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                      {q.course.title} ← {q.lesson.title}
                    </span>
                    {q.question_image_blob && (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-100">
                        صورة blob
                      </span>
                    )}
                    {!q.question_image_blob && q.question_image_url && (
                      <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-bold text-sky-800 dark:bg-sky-950/50 dark:text-sky-100">
                        صورة URL
                      </span>
                    )}
                  </div>
                  <p className="rounded-2xl bg-zinc-50 px-4 py-3 text-base font-semibold leading-8 text-zinc-900 dark:bg-zinc-950/60 dark:text-zinc-50">
                    <MathText text={q.prompt_text} fallback="(سؤال صورة)" />
                  </p>
                </div>
                <ul className="mt-4 grid gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                  {q.options.map((o) => {
                    const pending =
                      pendingCorrectKey[q.question_id] === o.option_key;
                    const saving = !!savingAnswerByQuestion[q.question_id];
                    const showCorrect =
                      o.is_correct && !(saving && pending);
                    return (
                    <li
                      key={o.option_key}
                      className={`rounded-xl border transition-colors ${
                        pending && saving
                          ? 'border-amber-400 bg-amber-50 shadow-[inset_0_0_0_1px] shadow-amber-300/80 ring-2 ring-amber-400/40 dark:border-amber-600 dark:bg-amber-950/40 dark:shadow-amber-700/50 dark:ring-amber-600/30'
                          : o.is_correct
                          ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30'
                          : 'border-zinc-200 bg-zinc-50/60 dark:border-zinc-700 dark:bg-zinc-800/40'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setCorrectAnswerInline(
                            q,
                            o.option_key as OptionKey
                          )
                        }
                        disabled={saving}
                        className="flex w-full items-start gap-2 px-3 py-2.5 text-start text-base disabled:opacity-70"
                      >
                        {pending && saving ? (
                          <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-amber-600" />
                        ) : showCorrect ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        ) : (
                          <Circle className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                        )}
                        <span className="font-mono text-sm opacity-70">
                          {o.option_key}.
                        </span>
                        <span
                          className={`flex-1 ${
                            pending && saving
                              ? 'font-semibold text-amber-900 dark:text-amber-100'
                              : o.is_correct
                              ? 'font-semibold text-emerald-700 dark:text-emerald-300'
                              : 'text-zinc-700 dark:text-zinc-300'
                          }`}
                        >
                          {o.option_text?.trim()
                            ? <MathText text={o.option_text} />
                            : (
                                <span className="text-zinc-400 italic">
                                  (فارغ — سيُستخدم «خيار {o.option_key}» عند الحفظ)
                                </span>
                              )}
                        </span>
                      </button>
                    </li>
                    );
                  })}
                </ul>
                <p className="mt-2 text-xs text-zinc-500">
                  اضغط أي اختيار لتعيينه كإجابة صحيحة مباشرة.
                </p>
                <div className="mt-4 flex gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={() =>
                      setModal({ type: 'options', question: q })
                    }
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 py-2.5 text-sm font-medium text-indigo-800 transition hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-200"
                  >
                    <Pencil className="h-4 w-4" />
                    تعديل الخيارات
                  </button>
                  {savingAnswerByQuestion[q.question_id] && (
                    <div className="inline-flex items-center gap-1 rounded-xl border border-amber-200 bg-amber-50 px-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      جارٍ الحفظ…
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('حذف هذا السؤال؟')) {
                        void (async () => {
                          try {
                            await ql.deleteQuestion(q.question_id);
                            await afterMutation();
                          } catch (e) {
                            setBanner(apiErr(e));
                          }
                        })();
                      }
                    }}
                    className="inline-flex items-center justify-center rounded-xl border border-red-100 px-4 py-2.5 text-red-600 transition hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-950/40"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                </div>
              </article>
              );
            })}
          </div>
        )}
      </section>

      {modal.type === 'options' && (
        <OptionsModal
          question={modal.question}
          onClose={() => setModal({ type: 'none' })}
          onSaved={async () => {
            await refreshQuestionsQuiet();
            setModal({ type: 'none' });
          }}
        />
      )}

      {previewImageUrl && (
        <ModalBackdrop
          title="معاينة صورة السؤال"
          onClose={() => setPreviewImageUrl(null)}
        >
          <div className="space-y-3">
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewImageUrl}
                alt="صورة السؤال مكبرة"
                className="max-h-[70vh] w-full object-contain"
              />
            </div>
            <p className="text-xs text-zinc-500">
              يمكنك إغلاق المعاينة بالضغط خارج المودال أو زر الإغلاق.
            </p>
          </div>
        </ModalBackdrop>
      )}
    </div>
  );
}

function OcrImportModal({
  lessonId,
  onClose,
  onDone,
}: {
  lessonId: number;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [inferCorrectAnswer, setInferCorrectAnswer] = useState(false);
  const [includeQuestionImages, setIncludeQuestionImages] = useState(true);
  const [pageFrom, setPageFrom] = useState('');
  const [pageTo, setPageTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<Awaited<
    ReturnType<typeof extractQuestionsFromFile>
  > | null>(null);
  const [correctByIndex, setCorrectByIndex] = useState<
    Partial<Record<number, OptionKey>>
  >({});

  function pickFiles(nextFiles: FileList | null) {
    const picked = nextFiles
      ? Array.from(nextFiles).sort((a, b) =>
          a.name.localeCompare(b.name, undefined, {
            numeric: true,
            sensitivity: 'base',
          })
        )
      : [];
    setFiles(picked);
    setResult(null);
    setCorrectByIndex({});
    setPageFrom('');
    setPageTo('');
    setErr(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (files.length === 0) {
      setErr('اختر ملف PDF أو صورة واحدة على الأقل أولًا');
      return;
    }
    if (files.length > 8) {
      setErr('الحد الأقصى هو 8 ملفات في طلب الاستخراج الواحد.');
      return;
    }
    const pdfFiles = files.filter((item) => isPdfFile(item));
    if (pdfFiles.length > 0 && files.length > 1) {
      setErr('لا يمكن رفع PDF مع ملفات أخرى. ارفع PDF واحد فقط أو عدة صور.');
      return;
    }
    if (pdfFiles.length === 0 && files.some((item) => !isImageFile(item))) {
      setErr('الرفع المتعدد متاح للصور فقط. الصيغ المدعومة موضحة أعلى.');
      return;
    }
    const hasPageRange = pageFrom.trim() || pageTo.trim();
    const parsedPageFrom = pageFrom.trim() ? Number(pageFrom) : undefined;
    const parsedPageTo = pageTo.trim() ? Number(pageTo) : undefined;

    if (hasPageRange) {
      if (!fileIsPdf) {
        setErr('تحديد الصفحات متاح لملفات PDF فقط.');
        return;
      }
      if (
        !parsedPageFrom ||
        !parsedPageTo ||
        !Number.isInteger(parsedPageFrom) ||
        !Number.isInteger(parsedPageTo) ||
        parsedPageFrom < 1 ||
        parsedPageTo < parsedPageFrom
      ) {
        setErr('اكتب نطاق صفحات صحيح: من صفحة رقم 1 أو أكثر، وإلى صفحة أكبر أو مساوية لها.');
        return;
      }
    }

    setBusy(true);
    try {
      const data = await extractQuestionsFromFile(files, {
        inferCorrectAnswer,
        includeQuestionImages,
        pageFrom: parsedPageFrom,
        pageTo: parsedPageTo,
      });
      const defaults: Partial<Record<number, OptionKey>> = {};
      data.questions.forEach((question, index) => {
        const key = correctKeyFromQuestion(question);
        if (key) defaults[index] = key;
      });
      setResult(data);
      setCorrectByIndex(defaults);
    } catch (e) {
      setErr(apiErr(e));
    } finally {
      setBusy(false);
    }
  }

  const fileIsPdf = files.length === 1 && isPdfFile(files[0]);

  function canSaveQuestion(question: OcrExtractedQuestion) {
    const options = normalizeOcrOptions(question);
    return (
      question.question_text.trim().length > 0 &&
      options.length === 4 &&
      options.every((option) => option.option_text.trim().length > 0)
    );
  }

  function removeExtractedQuestion(questionIndex: number) {
    setResult((prev) => {
      if (!prev) return prev;
      const questions = prev.questions.filter((_, index) => index !== questionIndex);
      return {
        ...prev,
        question_count: questions.length,
        questions,
      };
    });
    setCorrectByIndex((prev) => {
      const next: Partial<Record<number, OptionKey>> = {};
      for (const [key, value] of Object.entries(prev)) {
        const index = Number(key);
        if (index < questionIndex) {
          next[index] = value;
        } else if (index > questionIndex) {
          next[index - 1] = value;
        }
      }
      return next;
    });
    setErr(null);
  }

  async function addExtractedQuestions() {
    if (!result) return;
    if (result.questions.length === 0) {
      setErr('لا توجد أسئلة متبقية للإضافة.');
      return;
    }

    const invalidIndex = result.questions.findIndex((question) => !canSaveQuestion(question));
    if (invalidIndex >= 0) {
      setErr(`السؤال رقم ${invalidIndex + 1} لا يحتوي نصًا أو 4 اختيارات صالحة.`);
      return;
    }

    const missingCorrectIndex = result.questions.findIndex(
      (_question, index) => !correctByIndex[index]
    );
    if (missingCorrectIndex >= 0) {
      setErr(`حدد الإجابة الصحيحة للسؤال رقم ${missingCorrectIndex + 1} قبل الإضافة.`);
      return;
    }

    setErr(null);
    setAdding(true);
    try {
      for (const [index, question] of result.questions.entries()) {
        const correct_option_key = correctByIndex[index];
        if (!correct_option_key) continue;

        const primaryImage = primaryQuestionImage(question);
        await ql.createMcqQuestion(lessonId, {
          prompt_text: buildPromptText(question),
          ...(primaryImage?.image_blob
            ? {
                question_image_blob: primaryImage.image_blob,
                ...(primaryImage.image_mime_type
                  ? { question_image_mime_type: primaryImage.image_mime_type }
                  : {}),
              }
            : {}),
          options: normalizeOcrOptions(question),
          correct_option_key,
        });
      }
      await onDone();
    } catch (e) {
      setErr(apiErr(e));
    } finally {
      setAdding(false);
    }
  }

  return (
    <ModalBackdrop title="استخراج أسئلة من PDF أو صور" onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm leading-7 text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100">
          ارفع ملف PDF واحد أو عدة صور، وسيتم إرسال الطلب إلى خدمة OCR لاستخراج الأسئلة كـ
          Markdown + LaTeX. راجع النتيجة وحدد الإجابات الناقصة قبل إضافتها للدرس.
        </div>

        <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/60 p-4 dark:border-zinc-700 dark:bg-zinc-900/40">
          <label className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            ملف PDF واحد أو حتى 8 صور
          </label>
          <label className="mt-2 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-6 text-center text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800">
            <UploadCloud className="h-6 w-6 text-emerald-600" />
            <span className="max-w-full truncate">{selectedFilesLabel(files)}</span>
            <span className="text-xs font-normal text-zinc-500">
              PDF يرفع منفردًا. الصور يمكن رفعها معًا حتى 8 ملفات. الحد الأقصى 50MB لكل ملف.
            </span>
            <input
              type="file"
              accept="application/pdf,.pdf,image/png,image/jpeg,image/jpg,image/webp,image/gif,image/avif,image/bmp,image/tiff"
              multiple
              onChange={(e) => pickFiles(e.target.files)}
              className="hidden"
            />
          </label>
          {files.length > 1 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {files.map((item) => (
                <span
                  key={`${item.name}-${item.size}-${item.lastModified}`}
                  className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                >
                  {item.name}
                </span>
              ))}
            </div>
          )}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                من صفحة (PDF فقط)
              </label>
              <input
                type="number"
                min={1}
                value={pageFrom}
                disabled={!fileIsPdf}
                onChange={(e) => setPageFrom(e.target.value)}
                placeholder="مثال: 2"
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400 dark:border-zinc-600 dark:bg-zinc-950 dark:disabled:bg-zinc-800"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                إلى صفحة (PDF فقط)
              </label>
              <input
                type="number"
                min={1}
                value={pageTo}
                disabled={!fileIsPdf}
                onChange={(e) => setPageTo(e.target.value)}
                placeholder="مثال: 4"
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400 dark:border-zinc-600 dark:bg-zinc-950 dark:disabled:bg-zinc-800"
              />
            </div>
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            اترك النطاق فارغًا لاستخراج كل الملف. عند استخدامه يجب ملء الحقلين معًا.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900">
            <input
              type="checkbox"
              checked={inferCorrectAnswer}
              onChange={(e) => setInferCorrectAnswer(e.target.checked)}
              className="mt-1"
            />
            <span className="text-sm text-zinc-700 dark:text-zinc-300">
              <strong>استنتاج الإجابة الصحيحة</strong>
              <span className="block text-xs text-zinc-500">
                تظهر كاقتراح لو لم تكن الإجابة مكتوبة بوضوح في الملف.
              </span>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900">
            <input
              type="checkbox"
              checked={includeQuestionImages}
              onChange={(e) => setIncludeQuestionImages(e.target.checked)}
              className="mt-1"
            />
            <span className="text-sm text-zinc-700 dark:text-zinc-300">
              <strong>استخراج صور الأسئلة</strong>
              <span className="block text-xs text-zinc-500">
                ستظهر الصور المستخرجة في المعاينة وتحفظ كـ blob داخل قاعدة البيانات.
              </span>
            </span>
          </label>
        </div>

        {err && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            {err}
          </p>
        )}

        <button
          type="submit"
          disabled={busy || files.length === 0}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          {busy ? 'جاري استخراج الأسئلة…' : 'تنفيذ الاستخراج'}
        </button>
      </form>

      {result && (
        <section className="mt-6 space-y-5 border-t border-zinc-100 pt-5 dark:border-zinc-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-zinc-900 dark:text-white">
                نتيجة الاستخراج
              </h3>
              <p className="text-sm text-zinc-500">
                {result.filename} · {result.page_count} صفحة ·{' '}
                {result.question_count} سؤال
                {result.page_range
                  ? ` · الصفحات ${result.page_range.page_from}-${result.page_range.page_to}`
                  : ''}
                {result.extracted_images?.length
                  ? ` · ${result.extracted_images.length} صورة مستخرجة`
                  : ''}
              </p>
              {result.source_files?.length ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {result.source_files.map((source) => (
                    <span
                      key={`${source.filename}-${source.mime_type}`}
                      className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                    >
                      {source.filename}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => void addExtractedQuestions()}
              disabled={adding || busy || result.questions.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {adding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PlusCircle className="h-4 w-4" />
              )}
              {adding ? 'جاري الإضافة…' : 'إضافة الأسئلة للدرس'}
            </button>
          </div>

          {result.notes && (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
              {result.notes}
            </p>
          )}

          <div className="space-y-4">
            {result.questions.length === 0 && (
              <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/40">
                تم حذف كل الأسئلة من قائمة الاستيراد. نفّذ الاستخراج مرة أخرى إذا أردت إضافتها.
              </div>
            )}
            {result.questions.map((question, questionIndex) => {
              const options = normalizeOcrOptions(question);
              const selected = correctByIndex[questionIndex];
              const saveable = canSaveQuestion(question);

              return (
                <article
                  key={`${question.number}-${questionIndex}`}
                  className={`rounded-2xl border bg-white p-4 dark:bg-zinc-900 ${
                    saveable
                      ? 'border-zinc-200 dark:border-zinc-700'
                      : 'border-red-200 dark:border-red-900/60'
                  }`}
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                        سؤال {question.source_number ?? question.number}
                      </span>
                      {question.correct_answer_inferred && (
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800 dark:bg-amber-950/50 dark:text-amber-100">
                          الإجابة مقترحة بالاستنتاج
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeExtractedQuestion(questionIndex)}
                      disabled={adding}
                      className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-60 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200 dark:hover:bg-red-950/50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      حذف من الاستيراد
                    </button>
                  </div>

                  <p className="text-sm font-semibold leading-7 text-zinc-900 dark:text-zinc-50">
                    <MathText text={question.question_text} />
                  </p>

                  {(question.question_images?.length ?? 0) > 0 && (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {question.question_images?.map((image, index) => (
                        <div
                          key={`${image.image_id ?? image.image_blob ?? index}`}
                          className="rounded-xl border border-zinc-200 bg-zinc-50 p-2 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300"
                        >
                          {image.image_blob ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={image.image_blob}
                              alt={image.short_description ?? 'صورة سؤال مستخرجة'}
                              className="mb-2 max-h-40 w-full rounded-lg object-contain"
                            />
                          ) : null}
                          {image.short_description ?? image.image_id ?? 'صورة مرتبطة بالسؤال'}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 grid gap-2">
                    {options.map((option) => {
                      const active = selected === option.option_key;
                      return (
                        <button
                          key={option.option_key}
                          type="button"
                          onClick={() =>
                            setCorrectByIndex((prev) => ({
                              ...prev,
                              [questionIndex]: option.option_key,
                            }))
                          }
                          className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-start text-sm transition ${
                            active
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100'
                              : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800/40 dark:text-zinc-300 dark:hover:bg-zinc-800'
                          }`}
                        >
                          {active ? (
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                          ) : (
                            <Circle className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                          )}
                          <span className="font-mono text-xs opacity-70">
                            {option.option_key}.
                          </span>
                          <span className="min-w-0 flex-1">
                            <MathText
                              text={option.option_text}
                              fallback={
                                <span className="italic text-red-500">
                                  خيار فارغ
                                </span>
                              }
                            />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>

          <details className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-700 dark:bg-zinc-950">
            <summary className="cursor-pointer font-semibold text-zinc-800 dark:text-zinc-100">
              عرض response الخام
            </summary>
            <pre
              dir="ltr"
              className="mt-3 max-h-80 overflow-auto rounded-xl bg-zinc-950 p-4 text-xs leading-relaxed text-zinc-100"
            >
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </section>
      )}
    </ModalBackdrop>
  );
}
