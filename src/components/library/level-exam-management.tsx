'use client';

import {
  ArrowRight,
  CheckCircle2,
  Circle,
  FileQuestion,
  FileText,
  ImageIcon,
  Import,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  UploadCloud,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { MathText } from '@/components/library/math-text';
import { OcrImportModal } from '@/components/library/ocr-import-modal';
import {
  createGeneralExamQuestion,
  createLevelExamQuestion,
  deleteGeneralExamQuestion,
  deleteLevelExamQuestion,
  fetchGeneralExamAttempts,
  fetchGeneralExamQuestions,
  fetchLevelExamAttempts,
  fetchLevelExamQuestions,
  importGeneralExamQuestionsFromLibrary,
  importLevelExamQuestionsFromLibrary,
  updateGeneralExamQuestion,
  updateLevelExamQuestion,
  updateLevelExamQuestionCorrectOption,
  type LevelExamAttempt,
  type LevelExamQuestion,
  type McqQuestionPayload,
} from '@/lib/course-management-api';
import { apiErr } from '@/lib/library-errors';
import {
  buildPromptText,
  normalizeOcrOptions,
  primaryQuestionImage,
} from '@/lib/ocr-question-utils';
import * as ql from '@/lib/question-library-api';
import type { QuestionListItem } from '@/types/question-library';
import { OPTION_KEYS } from '@/types/question-library';

type ExamTab = 'questions' | 'attempts';
type ExamKind = 'level' | 'general';

function asOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function questionImageSrc(question: LevelExamQuestion) {
  return question.image_blob || question.image_url;
}

function formatDate(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ar-EG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function LevelExamManagement({ kind = 'level' }: { kind?: ExamKind }) {
  const params = useParams();
  const searchParams = useSearchParams();
  const examId = Number(params.examId);
  const courseId = searchParams.get('courseId');
  const examTitle =
    searchParams.get('title') || (kind === 'general' ? 'الامتحان العام' : 'امتحان المستوى');
  const contextTitle =
    searchParams.get(kind === 'general' ? 'courseTitle' : 'levelTitle') ||
    (kind === 'general' ? 'الكورس' : 'المستوى');

  const [tab, setTab] = useState<ExamTab>('questions');
  const [questions, setQuestions] = useState<LevelExamQuestion[]>([]);
  const [attempts, setAttempts] = useState<LevelExamAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [attemptsLoading, setAttemptsLoading] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [questionModal, setQuestionModal] = useState<
    { mode: 'create' } | { mode: 'edit'; question: LevelExamQuestion } | null
  >(null);
  const [deleteTarget, setDeleteTarget] = useState<LevelExamQuestion | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [ocrOpen, setOcrOpen] = useState(false);

  const backHref = courseId ? `/library/admin-courses/${courseId}` : '/library';
  const correctCount = useMemo(
    () => questions.reduce((sum, q) => sum + q.options.filter((o) => o.is_correct).length, 0),
    [questions]
  );

  async function loadQuestions() {
    if (!Number.isFinite(examId)) return;
    setLoading(true);
    setBanner(null);
    try {
      setQuestions(
        kind === 'general'
          ? await fetchGeneralExamQuestions(examId)
          : await fetchLevelExamQuestions(examId)
      );
    } catch (e) {
      setBanner(apiErr(e));
    } finally {
      setLoading(false);
    }
  }

  async function loadAttempts() {
    if (!Number.isFinite(examId)) return;
    setAttemptsLoading(true);
    setBanner(null);
    try {
      setAttempts(
        kind === 'general'
          ? await fetchGeneralExamAttempts(examId)
          : await fetchLevelExamAttempts(examId)
      );
    } catch (e) {
      setBanner(apiErr(e));
    } finally {
      setAttemptsLoading(false);
    }
  }

  async function deleteQuestion() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      if (kind === 'general') {
        await deleteGeneralExamQuestion(deleteTarget.id);
      } else {
        await deleteLevelExamQuestion(deleteTarget.id);
      }
      await loadQuestions();
      setDeleteTarget(null);
    } catch (e) {
      setBanner(apiErr(e));
    } finally {
      setDeleteBusy(false);
    }
  }

  async function updateCorrectOption(question: LevelExamQuestion, optionId: number) {
    if (kind === 'level') {
      await updateLevelExamQuestionCorrectOption(question.id, optionId);
      return;
    }

    await updateGeneralExamQuestion(question.id, {
      text: question.text,
      image_url: question.image_url,
      image_blob: question.image_blob,
      image_mime_type: question.image_mime_type,
      position: question.position,
      options: question.options
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((option) => ({
          text: option.text,
          position: option.position,
          is_correct: option.id === optionId,
        })),
    });
  }

  useEffect(() => {
    void loadQuestions();
    void loadAttempts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">
      <section className="relative overflow-hidden rounded-[1.6rem] bg-gradient-to-br from-blue-600 via-blue-700 to-zinc-950 p-5 text-white shadow-xl shadow-blue-500/20">
        <div className="absolute -start-16 -top-16 h-44 w-44 rounded-full bg-white/10" />
        <div className="absolute -bottom-20 end-16 h-48 w-48 rounded-full bg-orange-400/20" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-row-reverse items-start gap-4 text-right">
            <Link
              href={backHref}
              className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/25 bg-white/10 transition hover:bg-white/15"
              aria-label="رجوع"
            >
              <ArrowRight className="h-5 w-5" />
            </Link>
            <div>
              <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-black">
                {contextTitle}
              </span>
              <h1 className="mt-3 text-2xl font-black md:text-3xl">{examTitle}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-white/80">
                {kind === 'general'
                  ? 'إدارة أسئلة الامتحان العام، الاستيراد من مكتبة الأسئلة، ومراجعة مسارات تقارير النتائج.'
                  : 'إدارة أسئلة امتحان المستوى، الإجابة الصحيحة، الاستيراد من مكتبة الأسئلة، ومحاولات الطلاب.'}
              </p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 lg:w-[28rem]">
            <ExamStat label="الأسئلة" value={questions.length} />
            <ExamStat label="إجابات صحيحة" value={correctCount} />
            <ExamStat label="المحاولات" value={attempts.length} />
          </div>
        </div>
      </section>

      <div className="mt-5 grid gap-2 rounded-3xl border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setTab('questions')}
          className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition ${
            tab === 'questions'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
              : 'text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800'
          }`}
        >
          <FileQuestion className="h-4 w-4" />
          الأسئلة
        </button>
        <button
          type="button"
          onClick={() => setTab('attempts')}
          className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition ${
            tab === 'attempts'
              ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
              : 'text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800'
          }`}
        >
          <Users className="h-4 w-4" />
          {kind === 'general' ? 'التقارير' : 'محاولات الطلاب'}
        </button>
      </div>

      {banner && (
        <div
          className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-right text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          {banner}
        </div>
      )}

      {tab === 'questions' ? (
        <section className="mt-5 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setQuestionModal({ mode: 'create' })}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                إضافة سؤال
              </button>
              <button
                type="button"
                onClick={() => setImportOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-black text-orange-700 transition hover:bg-orange-100 dark:border-orange-900/50 dark:bg-orange-950/20 dark:text-orange-300"
              >
                <Import className="h-4 w-4" />
                استيراد من المكتبة
              </button>
              <button
                type="button"
                onClick={() => setOcrOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-emerald-700"
              >
                <FileText className="h-4 w-4" />
                استخراج من PDF/صورة
              </button>
            </div>
            <button
              type="button"
              onClick={loadQuestions}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 px-4 py-2.5 text-sm font-black text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              تحديث
            </button>
          </div>

          {loading ? (
            <div className="mt-5 rounded-3xl border border-dashed border-zinc-300 py-14 text-center text-zinc-500 dark:border-zinc-700">
              <Loader2 className="mx-auto mb-3 h-7 w-7 animate-spin" />
              جاري تحميل الأسئلة...
            </div>
          ) : questions.length === 0 ? (
            <p className="mt-5 rounded-3xl border border-dashed border-zinc-300 py-14 text-center text-sm text-zinc-500 dark:border-zinc-700">
              لا توجد أسئلة في هذا الاختبار بعد.
            </p>
          ) : (
            <div className="mt-5 space-y-3">
              {questions.map((question) => (
                <QuestionCard
                  key={question.id}
                  question={question}
                  onEdit={() => setQuestionModal({ mode: 'edit', question })}
                  onDelete={() => setDeleteTarget(question)}
                  onSetCorrect={updateCorrectOption}
                  onChanged={loadQuestions}
                  onError={setBanner}
                />
              ))}
            </div>
          )}
        </section>
      ) : (
        <AttemptsPanel
          attempts={attempts}
          loading={attemptsLoading}
          onRefresh={loadAttempts}
          title={kind === 'general' ? 'تقارير ومحاولات الامتحان العام' : 'محاولات الطلاب'}
          emptyText={
            kind === 'general'
              ? 'لا توجد محاولات لهذا الامتحان العام حتى الآن.'
              : 'لا توجد محاولات طلاب لهذا الاختبار حتى الآن.'
          }
        />
      )}

      {questionModal && (
        <QuestionFormModal
          examId={examId}
          kind={kind}
          state={questionModal}
          onClose={() => setQuestionModal(null)}
          onSaved={async () => {
            await loadQuestions();
            setQuestionModal(null);
          }}
          onError={setBanner}
        />
      )}

      {importOpen && (
        <ImportQuestionsModal
          examId={examId}
          kind={kind}
          onClose={() => setImportOpen(false)}
          onImported={async () => {
            await loadQuestions();
            setImportOpen(false);
          }}
          onError={setBanner}
        />
      )}

      {ocrOpen && (
        <OcrImportModal
          onClose={() => setOcrOpen(false)}
          onDone={async () => {
            await loadQuestions();
            setOcrOpen(false);
          }}
          addButtonLabel="إضافة الأسئلة للامتحان"
          introHint="راجع النتيجة وحدد الإجابات الناقصة قبل إضافتها للامتحان."
          onAddQuestions={async (extractedQuestions, correctByIndex) => {
            let position =
              questions.length > 0
                ? Math.max(...questions.map((q) => q.position ?? 0)) + 1
                : 1;

            for (const [index, question] of extractedQuestions.entries()) {
              const correctKey = correctByIndex[index];
              if (!correctKey) continue;

              const correctIndex = OPTION_KEYS.indexOf(correctKey);
              const primaryImage = primaryQuestionImage(question);
              const payload: McqQuestionPayload = {
                text: buildPromptText(question),
                position,
                ...(primaryImage?.image_blob
                  ? {
                      image_blob: primaryImage.image_blob,
                      image_mime_type: primaryImage.image_mime_type ?? null,
                    }
                  : {}),
                options: normalizeOcrOptions(question).map((option, optionIndex) => ({
                  text: option.option_text,
                  is_correct: optionIndex === correctIndex,
                  position: optionIndex + 1,
                })),
              };

              if (kind === 'general') {
                await createGeneralExamQuestion(examId, payload);
              } else {
                await createLevelExamQuestion(examId, payload);
              }
              position += 1;
            }
          }}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title="تأكيد حذف السؤال"
          message="هل تريد حذف هذا السؤال؟ سيتم حذف اختياراته المرتبطة من الامتحان."
          confirmLabel="حذف السؤال"
          busy={deleteBusy}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={deleteQuestion}
        />
      )}
    </div>
  );
}

function ExamStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 p-3 text-right backdrop-blur">
      <p className="text-2xl font-black">{value}</p>
      <p className="text-xs font-bold text-white/70">{label}</p>
    </div>
  );
}

function QuestionCard({
  question,
  onEdit,
  onDelete,
  onSetCorrect,
  onChanged,
  onError,
}: {
  question: LevelExamQuestion;
  onEdit: () => void;
  onDelete: () => void;
  onSetCorrect: (question: LevelExamQuestion, optionId: number) => Promise<void>;
  onChanged: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const [correctBusyId, setCorrectBusyId] = useState<number | null>(null);
  const imageSrc = questionImageSrc(question);

  async function setCorrect(optionId: number) {
    setCorrectBusyId(optionId);
    try {
      await onSetCorrect(question, optionId);
      await onChanged();
    } catch (e) {
      onError(apiErr(e));
    } finally {
      setCorrectBusyId(null);
    }
  }

  return (
    <article className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4 text-right dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-row-reverse items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black text-blue-600">سؤال #{question.position}</p>
          <p className="mt-2 text-base font-black leading-8 text-zinc-950 dark:text-white">
            <MathText text={question.text} fallback="(سؤال بدون نص)" />
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-xl p-2 text-blue-600 transition hover:bg-blue-50 dark:hover:bg-blue-950/30"
            aria-label="تعديل السؤال"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-xl p-2 text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:hover:bg-red-950/30"
            aria-label="حذف السؤال"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {imageSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageSrc}
          alt="صورة السؤال"
          className="mt-4 max-h-80 w-full rounded-2xl border border-zinc-200 object-contain dark:border-zinc-800"
        />
      ) : (
        <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-300 py-6 text-sm text-zinc-400 dark:border-zinc-700">
          <ImageIcon className="h-4 w-4" />
          بدون صورة
        </div>
      )}

      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {question.options
          .slice()
          .sort((a, b) => a.position - b.position)
          .map((option) => (
            <button
              type="button"
              key={option.id}
              onClick={() => setCorrect(option.id)}
              disabled={correctBusyId != null}
              className={`flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-right transition disabled:opacity-60 ${
                option.is_correct
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/25 dark:text-emerald-200'
                  : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800'
              }`}
            >
              {correctBusyId === option.id ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
              ) : option.is_correct ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-zinc-400" />
              )}
              <span className="min-w-0 flex-1 font-bold">
                <MathText text={option.text} fallback="(خيار فارغ)" />
              </span>
            </button>
          ))}
      </div>
    </article>
  );
}

function QuestionFormModal({
  examId,
  kind,
  state,
  onClose,
  onSaved,
  onError,
}: {
  examId: number;
  kind: ExamKind;
  state: { mode: 'create' } | { mode: 'edit'; question: LevelExamQuestion };
  onClose: () => void;
  onSaved: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const editing = state.mode === 'edit' ? state.question : null;
  const sortedOptions = editing?.options.slice().sort((a, b) => a.position - b.position);
  const [text, setText] = useState(editing?.text ?? '');
  const [imageUrl, setImageUrl] = useState(editing?.image_url ?? '');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [position, setPosition] = useState(editing ? String(editing.position) : '');
  const [options, setOptions] = useState(
    sortedOptions?.map((option) => option.text) ?? ['', '', '', '']
  );
  const [correctIndex, setCorrectIndex] = useState(
    Math.max(0, sortedOptions?.findIndex((option) => option.is_correct) ?? 0)
  );
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) {
      onError('نص السؤال مطلوب');
      return;
    }
    if (options.some((option) => !option.trim())) {
      onError('يجب إدخال 4 اختيارات');
      return;
    }

    const payload: McqQuestionPayload = {
      text: text.trim(),
      image_url: imageUrl.trim() || null,
      position: asOptionalNumber(position),
      options: options.map((option, index) => ({
        text: option.trim(),
        is_correct: index === correctIndex,
        position: index + 1,
      })),
    };

    setBusy(true);
    try {
      if (editing) {
        if (kind === 'general') {
          await updateGeneralExamQuestion(editing.id, payload, imageFile);
        } else {
          await updateLevelExamQuestion(editing.id, payload, imageFile);
        }
      } else {
        if (kind === 'general') {
          await createGeneralExamQuestion(examId, payload, imageFile);
        } else {
          await createLevelExamQuestion(examId, payload, imageFile);
        }
      }
      await onSaved();
    } catch (err) {
      onError(apiErr(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={editing ? 'تعديل سؤال' : 'إضافة سؤال'} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="space-y-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder="نص السؤال — يدعم LaTeX مثل $\\frac{1}{2}$ أو $3.14$"
            className={fieldClassName}
            dir="auto"
          />
          <div className="grid gap-3 md:grid-cols-[1fr_8rem]">
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="image_url اختياري"
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
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-3 text-sm font-bold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
            <UploadCloud className="h-4 w-4" />
            {imageFile ? imageFile.name : 'رفع صورة السؤال من الجهاز'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                setImageFile(e.target.files?.[0] ?? null);
                if (e.target.files?.[0]) setImageUrl('');
              }}
            />
          </label>

          <div className="grid gap-3 md:grid-cols-2">
            {options.map((option, index) => (
              <div key={index} className="rounded-2xl border border-zinc-200 p-3 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setCorrectIndex(index)}
                  className="mb-2 inline-flex items-center gap-2 text-sm font-black text-zinc-700 dark:text-zinc-200"
                >
                  {correctIndex === index ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Circle className="h-4 w-4 text-zinc-400" />
                  )}
                  الاختيار {index + 1}
                </button>
                <input
                  value={option}
                  onChange={(e) =>
                    setOptions((prev) => prev.map((item, i) => (i === index ? e.target.value : item)))
                  }
                  placeholder={`نص الاختيار ${index + 1} — مثال: $\\frac{3}{4}$`}
                  className={fieldClassName}
                  dir="auto"
                />
              </div>
            ))}
          </div>
        </div>

        <button type="submit" disabled={busy} className={primaryButtonClassName}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          حفظ السؤال
        </button>
      </form>
    </Modal>
  );
}

function ImportQuestionsModal({
  examId,
  kind,
  onClose,
  onImported,
  onError,
}: {
  examId: number;
  kind: ExamKind;
  onClose: () => void;
  onImported: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const [questions, setQuestions] = useState<QuestionListItem[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [startPosition, setStartPosition] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void ql
      .fetchQuestions({})
      .then((list) => {
        if (!cancelled) setQuestions(list);
      })
      .catch((e) => {
        if (!cancelled) onError(apiErr(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [onError]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (selected.length === 0) {
      onError('اختر سؤالًا واحدًا على الأقل للاستيراد');
      return;
    }

    setBusy(true);
    try {
      const payload = {
        question_ids: selected,
        start_position: asOptionalNumber(startPosition),
      };
      if (kind === 'general') {
        await importGeneralExamQuestionsFromLibrary(examId, payload);
      } else {
        await importLevelExamQuestionsFromLibrary(examId, payload);
      }
      await onImported();
    } catch (err) {
      onError(apiErr(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="استيراد أسئلة من مكتبة الأسئلة" onClose={onClose} maxWidth="max-w-4xl">
      <form onSubmit={submit}>
        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_10rem]">
          <div className="rounded-2xl bg-zinc-50 px-4 py-3 text-right text-sm text-zinc-500 dark:bg-zinc-950">
            المختار الآن: <span className="font-black text-zinc-900 dark:text-white">{selected.length}</span>
          </div>
          <input
            type="number"
            min={1}
            value={startPosition}
            onChange={(e) => setStartPosition(e.target.value)}
            placeholder="start_position"
            className={fieldClassName}
          />
        </div>

        {loading ? (
          <div className="rounded-3xl border border-dashed border-zinc-300 py-12 text-center text-zinc-500 dark:border-zinc-700">
            <Loader2 className="mx-auto mb-3 h-7 w-7 animate-spin" />
            جاري تحميل مكتبة الأسئلة...
          </div>
        ) : (
          <div className="max-h-[52vh] space-y-2 overflow-y-auto rounded-3xl border border-zinc-200 p-2 dark:border-zinc-800">
            {questions.map((question) => {
              const checked = selected.includes(question.question_id);
              return (
                <button
                  type="button"
                  key={question.question_id}
                  onClick={() =>
                    setSelected((prev) =>
                      checked
                        ? prev.filter((id) => id !== question.question_id)
                        : [...prev, question.question_id]
                    )
                  }
                  className={`flex w-full flex-row-reverse items-start gap-3 rounded-2xl border p-3 text-right transition ${
                    checked
                      ? 'border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/25'
                      : 'border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-950'
                  }`}
                >
                  {checked ? (
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-blue-600" />
                  ) : (
                    <Circle className="mt-1 h-4 w-4 shrink-0 text-zinc-400" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block line-clamp-2 font-bold text-zinc-900 dark:text-white">
                      <MathText
                        text={question.prompt_text}
                        fallback="سؤال بدون نص"
                      />
                    </span>
                    <span className="mt-1 block text-xs text-zinc-500">
                      {question.course.title} · {question.lesson.title}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <button type="submit" disabled={busy || loading} className={primaryButtonClassName}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          استيراد الأسئلة
        </button>
      </form>
    </Modal>
  );
}

function AttemptsPanel({
  attempts,
  loading,
  onRefresh,
  title,
  emptyText,
}: {
  attempts: LevelExamAttempt[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  title: string;
  emptyText: string;
}) {
  return (
    <section className="mt-5 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 px-4 py-2.5 text-sm font-black text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          تحديث
        </button>
        <h2 className="text-right text-xl font-black text-zinc-950 dark:text-white">
          {title}
        </h2>
      </div>

      {loading ? (
        <div className="mt-5 rounded-3xl border border-dashed border-zinc-300 py-14 text-center text-zinc-500 dark:border-zinc-700">
          <Loader2 className="mx-auto mb-3 h-7 w-7 animate-spin" />
          جاري تحميل المحاولات...
        </div>
      ) : attempts.length === 0 ? (
        <p className="mt-5 rounded-3xl border border-dashed border-zinc-300 py-14 text-center text-sm text-zinc-500 dark:border-zinc-700">
          {emptyText}
        </p>
      ) : (
        <div className="mt-5 overflow-hidden rounded-3xl border border-zinc-200 dark:border-zinc-800">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-right text-sm">
              <thead className="bg-zinc-50 text-xs font-black text-zinc-500 dark:bg-zinc-950">
                <tr>
                  <th className="px-4 py-3">الطالب</th>
                  <th className="px-4 py-3">الحالة</th>
                  <th className="px-4 py-3">بدأت</th>
                  <th className="px-4 py-3">تنتهي</th>
                  <th className="px-4 py-3">التسليم</th>
                  <th className="px-4 py-3">النتيجة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {attempts.map((attempt) => (
                  <tr key={attempt.id} className="bg-white dark:bg-zinc-900">
                    <td className="px-4 py-4">
                      <p className="font-black text-zinc-950 dark:text-white">{attempt.student.name}</p>
                      <p className="text-xs text-zinc-500" dir="ltr">{attempt.student.email}</p>
                    </td>
                    <td className="px-4 py-4 font-bold text-zinc-600 dark:text-zinc-300">
                      {attempt.status}
                    </td>
                    <td className="px-4 py-4 text-zinc-500">{formatDate(attempt.started_at)}</td>
                    <td className="px-4 py-4 text-zinc-500">{formatDate(attempt.expires_at)}</td>
                    <td className="px-4 py-4 text-zinc-500">{formatDate(attempt.submitted_at)}</td>
                    <td className="px-4 py-4">
                      {attempt.result ? (
                        <span className={`rounded-full px-3 py-1 text-xs font-black ${
                          attempt.result.passed
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                        }`}>
                          {attempt.result.score}/{attempt.result.max_score} · {attempt.result.percentage}%
                        </span>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
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

function Modal({
  title,
  onClose,
  children,
  maxWidth = 'max-w-3xl',
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-label="إغلاق"
        onClick={onClose}
      />
      <div className={`relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-3xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 ${maxWidth}`}>
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
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function ConfirmModal({
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

const fieldClassName =
  'w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-right text-sm outline-none transition placeholder:text-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100';

const primaryButtonClassName =
  'mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-700 disabled:opacity-60';
