'use client';

import {
  CheckCircle2,
  Circle,
  FileText,
  Loader2,
  PlusCircle,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { useState } from 'react';
import { MathText } from '@/components/library/math-text';
import { ModalBackdrop } from '@/components/library/library-modals';
import { apiErr } from '@/lib/library-errors';
import {
  canSaveOcrQuestion,
  correctKeyFromQuestion,
  isImageFile,
  isPdfFile,
  normalizeOcrOptions,
  selectedFilesLabel,
} from '@/lib/ocr-question-utils';
import { extractQuestionsFromFile, type OcrExtractedQuestion } from '@/lib/ocr-api';
import type { OptionKey } from '@/types/question-library';

export function OcrImportModal({
  onClose,
  onDone,
  addButtonLabel,
  introHint,
  onAddQuestions,
}: {
  onClose: () => void;
  onDone: () => Promise<void>;
  addButtonLabel: string;
  introHint: string;
  onAddQuestions: (
    questions: OcrExtractedQuestion[],
    correctByIndex: Partial<Record<number, OptionKey>>
  ) => Promise<void>;
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

    const invalidIndex = result.questions.findIndex(
      (question) => !canSaveOcrQuestion(question)
    );
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
      await onAddQuestions(result.questions, correctByIndex);
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
          Markdown + LaTeX. {introHint}
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
              {adding ? 'جاري الإضافة…' : addButtonLabel}
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
              const saveable = canSaveOcrQuestion(question);

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
