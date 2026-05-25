'use client';

import {
  CheckCircle2,
  ChevronRight,
  Circle,
  Expand,
  HelpCircle,
  ImagePlus,
  LayoutGrid,
  Loader2,
  ListChecks,
  Pencil,
  PlusCircle,
  ScrollText,
  Trash2,
} from 'lucide-react';
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
import { apiErr } from '@/lib/library-errors';
import * as ql from '@/lib/question-library-api';
import type { OptionKey, QuestionListItem } from '@/types/question-library';

type AddTab = 'mcq' | 'bulk' | 'arabic';

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
  const [modal, setModal] = useState<ModalState>({ type: 'none' });
  const [addTab, setAddTab] = useState<AddTab>('mcq');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
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
        <div className="mt-5">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-700"
          >
            <PlusCircle className="h-4 w-4" />
            إضافة أسئلة
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
          <div className="grid gap-5 md:grid-cols-2">
            {questions.map((q) => (
              <article
                key={q.question_id}
                className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex gap-4">
                  {q.question_image_url ? (
                    <button
                      type="button"
                      onClick={() => setPreviewImageUrl(q.question_image_url)}
                      className="group relative h-36 w-36 shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800"
                      aria-label="تكبير صورة السؤال"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={q.question_image_url}
                        alt="صورة السؤال"
                        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                      />
                      <span className="absolute inset-x-0 bottom-0 inline-flex items-center justify-center gap-1 bg-black/55 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                        <Expand className="h-3.5 w-3.5" />
                        تكبير
                      </span>
                    </button>
                  ) : (
                    <div className="flex h-36 w-36 shrink-0 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800">
                      <HelpCircle className="h-10 w-10 text-zinc-400" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                      {q.course.title} ← {q.lesson.title}
                    </p>
                    <p className="mt-2 font-medium leading-snug text-zinc-900 dark:text-zinc-50">
                      {q.prompt_text || '(سؤال صورة)'}
                    </p>
                  </div>
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
                        className="flex w-full items-start gap-2 px-3 py-2 text-start text-sm disabled:opacity-70"
                      >
                        {pending && saving ? (
                          <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-amber-600" />
                        ) : showCorrect ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        ) : (
                          <Circle className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                        )}
                        <span className="font-mono text-xs opacity-70">
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
                            ? o.option_text
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
              </article>
            ))}
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
