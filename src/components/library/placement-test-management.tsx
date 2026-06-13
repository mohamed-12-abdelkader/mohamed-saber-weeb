'use client';

import {
  CheckCircle2,
  Circle,
  ClipboardList,
  FileQuestion,
  Gauge,
  ImageIcon,
  Import,
  Layers,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Settings2,
  Trash2,
  UploadCloud,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { apiErr } from '@/lib/library-errors';
import * as placement from '@/lib/placement-test-api';
import * as ql from '@/lib/question-library-api';
import type { QuestionListItem } from '@/types/question-library';

type Tab = 'levels' | 'test' | 'questions' | 'attempts';

function asNumber(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });
}

function imageSrc(question: placement.PlacementQuestion) {
  return question.image_blob || question.image_url;
}

export function PlacementTestManagement() {
  const [tab, setTab] = useState<Tab>('test');
  const [levels, setLevels] = useState<placement.PlacementLevel[]>([]);
  const [tests, setTests] = useState<placement.PlacementTest[]>([]);
  const [questions, setQuestions] = useState<placement.PlacementQuestion[]>([]);
  const [attempts, setAttempts] = useState<placement.PlacementAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [attemptsLoading, setAttemptsLoading] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [levelModal, setLevelModal] = useState<
    { mode: 'create' } | { mode: 'edit'; level: placement.PlacementLevel } | null
  >(null);
  const [testModal, setTestModal] = useState<
    { mode: 'create' } | { mode: 'edit'; test: placement.PlacementTest } | null
  >(null);
  const [questionModal, setQuestionModal] = useState<
    { mode: 'create' } | { mode: 'edit'; question: placement.PlacementQuestion } | null
  >(null);
  const [importOpen, setImportOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<
    | { type: 'level'; id: number; title: string }
    | { type: 'test'; id: number; title: string }
    | { type: 'question'; id: number; title: string }
    | null
  >(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [attemptDetail, setAttemptDetail] = useState<placement.PlacementAttemptDetail | null>(null);
  const [attemptDetailLoading, setAttemptDetailLoading] = useState(false);

  const activeTest = tests[0] ?? null;
  const maxScore = useMemo(
    () => questions.reduce((sum, question) => sum + Number(question.points || 0), 0),
    [questions]
  );

  async function loadBase() {
    setLoading(true);
    setBanner(null);
    try {
      const [nextLevels, nextTests] = await Promise.all([
        placement.fetchPlacementLevelsAdmin(),
        placement.fetchPlacementTests(),
      ]);
      setLevels(nextLevels);
      setTests(nextTests);
      if (nextTests[0]) {
        await Promise.all([loadQuestions(nextTests[0].id), loadAttempts(nextTests[0].id)]);
      } else {
        setQuestions([]);
        setAttempts([]);
      }
    } catch (e) {
      setBanner(apiErr(e));
    } finally {
      setLoading(false);
    }
  }

  async function loadQuestions(testId = activeTest?.id) {
    if (!testId) return;
    setQuestionsLoading(true);
    try {
      setQuestions(await placement.fetchPlacementQuestions(testId));
    } catch (e) {
      setBanner(apiErr(e));
    } finally {
      setQuestionsLoading(false);
    }
  }

  async function loadAttempts(testId = activeTest?.id) {
    setAttemptsLoading(true);
    try {
      setAttempts(await placement.fetchPlacementAttempts({ test_id: testId, limit: 50, skip: 0 }));
    } catch (e) {
      setBanner(apiErr(e));
    } finally {
      setAttemptsLoading(false);
    }
  }

  async function deleteSelected() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      if (deleteTarget.type === 'level') {
        await placement.deletePlacementLevel(deleteTarget.id);
      } else if (deleteTarget.type === 'test') {
        await placement.deletePlacementTest(deleteTarget.id);
      } else {
        await placement.deletePlacementQuestion(deleteTarget.id);
      }
      setDeleteTarget(null);
      await loadBase();
    } catch (e) {
      setBanner(apiErr(e));
    } finally {
      setDeleteBusy(false);
    }
  }

  async function openAttempt(attemptId: number) {
    setAttemptDetailLoading(true);
    try {
      setAttemptDetail(await placement.fetchPlacementAttemptDetail(attemptId));
    } catch (e) {
      setBanner(apiErr(e));
    } finally {
      setAttemptDetailLoading(false);
    }
  }

  useEffect(() => {
    void loadBase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-8">
      <section className="relative overflow-hidden rounded-[1.6rem] bg-gradient-to-br from-violet-600 via-blue-700 to-zinc-950 p-5 text-white shadow-xl shadow-blue-500/20">
        <div className="absolute -start-16 -top-16 h-44 w-44 rounded-full bg-white/10" />
        <div className="absolute -bottom-20 end-16 h-48 w-48 rounded-full bg-orange-400/20" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-right">
            <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-black">
              Placement Test Admin
            </span>
            <h1 className="mt-3 text-2xl font-black md:text-3xl">إدارة امتحان تحديد المستوى</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-white/80">
              أنشئ مستويات التصنيف، اضبط الاختبار، أدِر بنك الأسئلة، وتابع نتائج ومحاولات الطلاب.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-4 lg:w-[34rem]">
            <HeroStat label="المستويات" value={levels.length} />
            <HeroStat label="الاختبارات" value={tests.length} />
            <HeroStat label="الأسئلة" value={questions.length} />
            <HeroStat label="الدرجة" value={maxScore} />
          </div>
        </div>
      </section>

      <div className="mt-5 grid gap-2 rounded-3xl border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900 md:grid-cols-4">
        {[
          { key: 'test' as const, label: 'الاختبار', icon: Settings2 },
          { key: 'levels' as const, label: 'المستويات', icon: Layers },
          { key: 'questions' as const, label: 'الأسئلة', icon: FileQuestion },
          { key: 'attempts' as const, label: 'المحاولات', icon: Users },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-black transition ${
              tab === key
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {banner && (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-right text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          {banner}
        </div>
      )}

      {loading ? (
        <div className="mt-6 rounded-3xl border border-zinc-200 bg-white py-16 text-center text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
          <Loader2 className="mx-auto mb-3 h-7 w-7 animate-spin" />
          جاري تحميل إدارة تحديد المستوى...
        </div>
      ) : tab === 'levels' ? (
        <LevelsPanel
          levels={levels}
          onCreate={() => setLevelModal({ mode: 'create' })}
          onEdit={(level) => setLevelModal({ mode: 'edit', level })}
          onDelete={(level) =>
            setDeleteTarget({ type: 'level', id: level.id, title: level.name })
          }
        />
      ) : tab === 'test' ? (
        <TestsPanel
          tests={tests}
          onCreate={() => setTestModal({ mode: 'create' })}
          onEdit={(test) => setTestModal({ mode: 'edit', test })}
          onDelete={(test) => setDeleteTarget({ type: 'test', id: test.id, title: test.title })}
        />
      ) : tab === 'questions' ? (
        <QuestionsPanel
          test={activeTest}
          questions={questions}
          loading={questionsLoading}
          onRefresh={() => loadQuestions()}
          onCreate={() => setQuestionModal({ mode: 'create' })}
          onImport={() => setImportOpen(true)}
          onEdit={(question) => setQuestionModal({ mode: 'edit', question })}
          onDelete={(question) =>
            setDeleteTarget({ type: 'question', id: question.id, title: question.text })
          }
        />
      ) : (
        <AttemptsPanel
          attempts={attempts}
          loading={attemptsLoading}
          detailLoading={attemptDetailLoading}
          onRefresh={() => loadAttempts()}
          onOpen={openAttempt}
        />
      )}

      {levelModal && (
        <LevelModal
          state={levelModal}
          onClose={() => setLevelModal(null)}
          onSaved={async () => {
            await loadBase();
            setLevelModal(null);
          }}
          onError={setBanner}
        />
      )}

      {testModal && (
        <TestModal
          state={testModal}
          onClose={() => setTestModal(null)}
          onSaved={async () => {
            await loadBase();
            setTestModal(null);
          }}
          onError={setBanner}
        />
      )}

      {questionModal && activeTest && (
        <QuestionModal
          testId={activeTest.id}
          state={questionModal}
          onClose={() => setQuestionModal(null)}
          onSaved={async () => {
            await loadQuestions(activeTest.id);
            setQuestionModal(null);
          }}
          onError={setBanner}
        />
      )}

      {importOpen && activeTest && (
        <ImportModal
          testId={activeTest.id}
          onClose={() => setImportOpen(false)}
          onImported={async () => {
            await loadQuestions(activeTest.id);
            setImportOpen(false);
          }}
          onError={setBanner}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title="تأكيد الحذف"
          message={`هل تريد حذف "${deleteTarget.title}"؟`}
          confirmLabel="حذف"
          busy={deleteBusy}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={deleteSelected}
        />
      )}

      {attemptDetail && (
        <AttemptDetailModal detail={attemptDetail} onClose={() => setAttemptDetail(null)} />
      )}
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 p-3 text-right backdrop-blur">
      <p className="text-2xl font-black">{value}</p>
      <p className="text-xs font-bold text-white/70">{label}</p>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon: typeof Gauge;
  title: string;
  hint: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      {action}
      <div className="flex flex-row-reverse items-start gap-3 text-right">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-300">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-xl font-black text-zinc-950 dark:text-white">{title}</h2>
          <p className="mt-1 text-sm text-zinc-500">{hint}</p>
        </div>
      </div>
    </div>
  );
}

function LevelsPanel({
  levels,
  onCreate,
  onEdit,
  onDelete,
}: {
  levels: placement.PlacementLevel[];
  onCreate: () => void;
  onEdit: (level: placement.PlacementLevel) => void;
  onDelete: (level: placement.PlacementLevel) => void;
}) {
  return (
    <section className="mt-6 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <SectionHeader
        icon={Layers}
        title="مستويات تحديد المستوى"
        hint="النسبة المئوية للطالب تحدد المستوى المطابق حسب هذه النطاقات."
        action={
          <button type="button" onClick={onCreate} className={primarySmallButtonClassName}>
            <Plus className="h-4 w-4" />
            إضافة مستوى
          </button>
        }
      />
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {levels.length === 0 ? (
          <EmptyState text="لا توجد مستويات بعد. أضف مستويات تغطي النطاق من 0 إلى 100." />
        ) : (
          levels.map((level) => (
            <div key={level.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-right dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-2">
                  <button type="button" onClick={() => onEdit(level)} className={iconButtonClassName}>
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => onDelete(level)} className={dangerIconButtonClassName}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div>
                  <p className="text-lg font-black text-zinc-950 dark:text-white">{level.name}</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    من {level.min_percent}% إلى {level.max_percent}% · ترتيب {level.sort_order}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function TestsPanel({
  tests,
  onCreate,
  onEdit,
  onDelete,
}: {
  tests: placement.PlacementTest[];
  onCreate: () => void;
  onEdit: (test: placement.PlacementTest) => void;
  onDelete: (test: placement.PlacementTest) => void;
}) {
  return (
    <section className="mt-6 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <SectionHeader
        icon={Settings2}
        title="اختبار تحديد المستوى"
        hint="النظام يسمح عمليًا باختبار واحد فقط، ويمكن تعديل إعداداته من هنا."
        action={
          <button
            type="button"
            onClick={onCreate}
            disabled={tests.length > 0}
            className={primarySmallButtonClassName}
          >
            <Plus className="h-4 w-4" />
            إنشاء اختبار
          </button>
        }
      />
      <div className="mt-5 space-y-3">
        {tests.length === 0 ? (
          <EmptyState text="لا يوجد اختبار تحديد مستوى بعد. أنشئ اختبارًا ثم أضف له الأسئلة." />
        ) : (
          tests.map((test) => (
            <div key={test.id} className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5 text-right dark:border-zinc-800 dark:bg-zinc-950">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex gap-2">
                  <button type="button" onClick={() => onEdit(test)} className={iconButtonClassName}>
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => onDelete(test)} className={dangerIconButtonClassName}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="min-w-0">
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${
                    test.is_active
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                  }`}>
                    {test.is_active ? 'نشط' : 'متوقف'}
                  </span>
                  <h3 className="mt-3 text-2xl font-black text-zinc-950 dark:text-white">{test.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-zinc-500">{test.description || 'بدون وصف'}</p>
                </div>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-4">
                <InfoTile label="المدة" value={`${test.duration_minutes} دقيقة`} />
                <InfoTile label="المحاولات" value={String(test.max_attempts)} />
                <InfoTile label="أسئلة/محاولة" value={String(test.questions_per_attempt)} />
                <InfoTile label="بنك الأسئلة" value={String(test.question_count ?? 0)} />
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function QuestionsPanel({
  test,
  questions,
  loading,
  onRefresh,
  onCreate,
  onImport,
  onEdit,
  onDelete,
}: {
  test: placement.PlacementTest | null;
  questions: placement.PlacementQuestion[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  onCreate: () => void;
  onImport: () => void;
  onEdit: (question: placement.PlacementQuestion) => void;
  onDelete: (question: placement.PlacementQuestion) => void;
}) {
  return (
    <section className="mt-6 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <SectionHeader
        icon={FileQuestion}
        title="بنك أسئلة اختبار تحديد المستوى"
        hint="كل سؤال يحتاج اختيارين على الأقل وإجابة صحيحة واحدة."
        action={
          <div className="flex gap-2">
            <button type="button" onClick={onCreate} disabled={!test} className={primarySmallButtonClassName}>
              <Plus className="h-4 w-4" />
              إضافة سؤال
            </button>
            <button type="button" onClick={onImport} disabled={!test} className={secondarySmallButtonClassName}>
              <Import className="h-4 w-4" />
              استيراد
            </button>
            <button type="button" onClick={onRefresh} disabled={!test || loading} className={ghostSmallButtonClassName}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              تحديث
            </button>
          </div>
        }
      />
      {!test ? (
        <EmptyState text="أنشئ اختبار تحديد مستوى أولًا قبل إدارة الأسئلة." />
      ) : loading ? (
        <LoadingState text="جاري تحميل الأسئلة..." />
      ) : questions.length === 0 ? (
        <EmptyState text="لا توجد أسئلة بعد. أضف سؤالًا أو استورد من مكتبة الأسئلة." />
      ) : (
        <div className="mt-5 space-y-3">
          {questions.map((question) => (
            <QuestionCard
              key={question.id}
              question={question}
              onEdit={() => onEdit(question)}
              onDelete={() => onDelete(question)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function QuestionCard({
  question,
  onEdit,
  onDelete,
}: {
  question: placement.PlacementQuestion;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const src = imageSrc(question);
  return (
    <article className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4 text-right dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-2">
          <button type="button" onClick={onEdit} className={iconButtonClassName}>
            <Pencil className="h-4 w-4" />
          </button>
          <button type="button" onClick={onDelete} className={dangerIconButtonClassName}>
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-black text-blue-600">سؤال #{question.position} · {question.points} نقطة</p>
          <p className="mt-2 whitespace-pre-wrap text-base font-black leading-7 text-zinc-950 dark:text-white">
            {question.text}
          </p>
        </div>
      </div>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="صورة السؤال" className="mt-4 max-h-72 w-full rounded-2xl border border-zinc-200 object-contain dark:border-zinc-800" />
      ) : (
        <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-300 py-6 text-sm text-zinc-400 dark:border-zinc-700">
          <ImageIcon className="h-4 w-4" />
          بدون صورة
        </div>
      )}
      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {question.choices
          .slice()
          .sort((a, b) => a.position - b.position)
          .map((choice) => (
            <div
              key={choice.id}
              className={`flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 ${
                choice.is_correct
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/25 dark:text-emerald-200'
                  : 'border-zinc-200 bg-white text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200'
              }`}
            >
              {choice.is_correct ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-zinc-400" />
              )}
              <span className="min-w-0 flex-1 font-bold">{choice.text}</span>
            </div>
          ))}
      </div>
    </article>
  );
}

function AttemptsPanel({
  attempts,
  loading,
  detailLoading,
  onRefresh,
  onOpen,
}: {
  attempts: placement.PlacementAttempt[];
  loading: boolean;
  detailLoading: boolean;
  onRefresh: () => Promise<void>;
  onOpen: (attemptId: number) => Promise<void>;
}) {
  return (
    <section className="mt-6 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <SectionHeader
        icon={Users}
        title="محاولات الطلاب"
        hint="تابع نتيجة كل طالب والمستوى الذي تم تعيينه بعد الاختبار."
        action={
          <button type="button" onClick={onRefresh} disabled={loading} className={ghostSmallButtonClassName}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </button>
        }
      />
      {loading ? (
        <LoadingState text="جاري تحميل المحاولات..." />
      ) : attempts.length === 0 ? (
        <EmptyState text="لا توجد محاولات حتى الآن." />
      ) : (
        <div className="mt-5 overflow-hidden rounded-3xl border border-zinc-200 dark:border-zinc-800">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-right text-sm">
              <thead className="bg-zinc-50 text-xs font-black text-zinc-500 dark:bg-zinc-950">
                <tr>
                  <th className="px-4 py-3">الطالب</th>
                  <th className="px-4 py-3">الدرجة</th>
                  <th className="px-4 py-3">النسبة</th>
                  <th className="px-4 py-3">المستوى</th>
                  <th className="px-4 py-3">وقت الإكمال</th>
                  <th className="px-4 py-3">التفاصيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {attempts.map((attempt) => (
                  <tr key={attempt.attempt_id} className="bg-white dark:bg-zinc-900">
                    <td className="px-4 py-4">
                      <p className="font-black text-zinc-950 dark:text-white">{attempt.student.name}</p>
                      <p className="text-xs text-zinc-500" dir="ltr">{attempt.student.email}</p>
                    </td>
                    <td className="px-4 py-4 font-bold text-zinc-700 dark:text-zinc-200">
                      {attempt.score}/{attempt.max_score}
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
                        {attempt.percentage}%
                      </span>
                    </td>
                    <td className="px-4 py-4 text-zinc-600 dark:text-zinc-300">
                      {attempt.placement_level?.name ?? 'بدون مستوى'}
                    </td>
                    <td className="px-4 py-4 text-zinc-500">{formatDate(attempt.completed_at)}</td>
                    <td className="px-4 py-4">
                      <button
                        type="button"
                        onClick={() => onOpen(attempt.attempt_id)}
                        disabled={detailLoading}
                        className="rounded-xl bg-zinc-100 px-3 py-2 text-xs font-black text-zinc-700 transition hover:bg-zinc-200 disabled:opacity-60 dark:bg-zinc-800 dark:text-zinc-200"
                      >
                        عرض التفاصيل
                      </button>
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

function LevelModal({
  state,
  onClose,
  onSaved,
  onError,
}: {
  state: { mode: 'create' } | { mode: 'edit'; level: placement.PlacementLevel };
  onClose: () => void;
  onSaved: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const level = state.mode === 'edit' ? state.level : null;
  const [name, setName] = useState(level?.name ?? '');
  const [minPercent, setMinPercent] = useState(level ? String(level.min_percent) : '');
  const [maxPercent, setMaxPercent] = useState(level ? String(level.max_percent) : '');
  const [sortOrder, setSortOrder] = useState(level ? String(level.sort_order) : '');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const min = asNumber(minPercent);
    const max = asNumber(maxPercent);
    if (!name.trim() || min == null || max == null) {
      onError('اسم المستوى ونطاق النسبة مطلوبان');
      return;
    }
    if (min > max) {
      onError('أقل نسبة يجب أن تكون أصغر من أو تساوي أعلى نسبة');
      return;
    }
    setBusy(true);
    try {
      const payload = {
        name: name.trim(),
        min_percent: min,
        max_percent: max,
        sort_order: asOptionalNumber(sortOrder),
      };
      if (level) await placement.updatePlacementLevel(level.id, payload);
      else await placement.createPlacementLevel(payload);
      await onSaved();
    } catch (err) {
      onError(apiErr(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={level ? 'تعديل مستوى' : 'إضافة مستوى'} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="space-y-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسم المستوى" className={fieldClassName} />
          <div className="grid gap-3 md:grid-cols-3">
            <input type="number" min={0} max={100} step="0.01" value={minPercent} onChange={(e) => setMinPercent(e.target.value)} placeholder="min_percent" className={fieldClassName} />
            <input type="number" min={0} max={100} step="0.01" value={maxPercent} onChange={(e) => setMaxPercent(e.target.value)} placeholder="max_percent" className={fieldClassName} />
            <input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} placeholder="sort_order" className={fieldClassName} />
          </div>
        </div>
        <button type="submit" disabled={busy} className={primaryButtonClassName}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          حفظ المستوى
        </button>
      </form>
    </Modal>
  );
}

function TestModal({
  state,
  onClose,
  onSaved,
  onError,
}: {
  state: { mode: 'create' } | { mode: 'edit'; test: placement.PlacementTest };
  onClose: () => void;
  onSaved: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const test = state.mode === 'edit' ? state.test : null;
  const [title, setTitle] = useState(test?.title ?? 'اختبار تحديد المستوى');
  const [description, setDescription] = useState(test?.description ?? '');
  const [isActive, setIsActive] = useState(test?.is_active ?? false);
  const [maxAttempts, setMaxAttempts] = useState(test ? String(test.max_attempts) : '3');
  const [questionsPerAttempt, setQuestionsPerAttempt] = useState(
    test ? String(test.questions_per_attempt) : '10'
  );
  const [durationMinutes, setDurationMinutes] = useState(
    test ? String(test.duration_minutes) : '60'
  );
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      onError('عنوان الاختبار مطلوب');
      return;
    }
    const attempts = asNumber(maxAttempts);
    const perAttempt = asNumber(questionsPerAttempt);
    const duration = asNumber(durationMinutes);
    if (!attempts || !perAttempt || !duration) {
      onError('عدد المحاولات والأسئلة والمدة يجب أن تكون أرقامًا صحيحة');
      return;
    }
    setBusy(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        is_active: isActive,
        max_attempts: attempts,
        questions_per_attempt: perAttempt,
        duration_minutes: duration,
      };
      if (test) await placement.updatePlacementTest(test.id, payload);
      else await placement.createPlacementTest(payload);
      await onSaved();
    } catch (err) {
      onError(apiErr(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={test ? 'تعديل الاختبار' : 'إنشاء اختبار تحديد المستوى'} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="space-y-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان الاختبار" className={fieldClassName} />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="وصف الاختبار" rows={3} className={fieldClassName} />
          <div className="grid gap-3 md:grid-cols-3">
            <input type="number" min={1} value={maxAttempts} onChange={(e) => setMaxAttempts(e.target.value)} placeholder="max_attempts" className={fieldClassName} />
            <input type="number" min={1} value={questionsPerAttempt} onChange={(e) => setQuestionsPerAttempt(e.target.value)} placeholder="questions_per_attempt" className={fieldClassName} />
            <input type="number" min={1} max={600} value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} placeholder="duration_minutes" className={fieldClassName} />
          </div>
          <label className="flex cursor-pointer items-center justify-between rounded-2xl bg-zinc-50 px-4 py-3 text-sm font-bold dark:bg-zinc-950">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            الاختبار نشط
          </label>
        </div>
        <button type="submit" disabled={busy} className={primaryButtonClassName}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          حفظ الاختبار
        </button>
      </form>
    </Modal>
  );
}

function QuestionModal({
  testId,
  state,
  onClose,
  onSaved,
  onError,
}: {
  testId: number;
  state: { mode: 'create' } | { mode: 'edit'; question: placement.PlacementQuestion };
  onClose: () => void;
  onSaved: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const editing = state.mode === 'edit' ? state.question : null;
  const sortedChoices = editing?.choices.slice().sort((a, b) => a.position - b.position);
  const [text, setText] = useState(editing?.text ?? '');
  const [points, setPoints] = useState(editing ? String(editing.points) : '1');
  const [position, setPosition] = useState(editing ? String(editing.position) : '');
  const [imageUrl, setImageUrl] = useState(editing?.image_url ?? '');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [choices, setChoices] = useState(
    sortedChoices?.map((choice) => choice.text) ?? ['', '', '', '']
  );
  const [correctIndex, setCorrectIndex] = useState(
    Math.max(0, sortedChoices?.findIndex((choice) => choice.is_correct) ?? 0)
  );
  const [busy, setBusy] = useState(false);

  function addChoice() {
    setChoices((prev) => [...prev, '']);
  }

  function removeChoice(index: number) {
    setChoices((prev) => prev.filter((_, i) => i !== index));
    setCorrectIndex((prev) => (prev >= index ? Math.max(0, prev - 1) : prev));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const numericPoints = asNumber(points);
    const filledChoices = choices.map((choice) => choice.trim()).filter(Boolean);
    if (!text.trim() || !numericPoints || numericPoints <= 0) {
      onError('نص السؤال والنقاط مطلوبان');
      return;
    }
    if (filledChoices.length < 2) {
      onError('السؤال يجب أن يحتوي اختيارين على الأقل');
      return;
    }
    if (correctIndex >= filledChoices.length) {
      onError('اختر إجابة صحيحة من الاختيارات الموجودة');
      return;
    }

    const payload: placement.PlacementQuestionPayload = {
      text: text.trim(),
      points: numericPoints,
      position: asOptionalNumber(position),
      image_url: imageUrl.trim() || null,
      choices: filledChoices.map((choice, index) => ({
        text: choice,
        is_correct: index === correctIndex,
        position: index,
      })),
    };

    setBusy(true);
    try {
      if (editing) {
        await placement.updatePlacementQuestion(editing.id, payload, imageFile);
      } else {
        await placement.createPlacementQuestion(testId, payload, imageFile);
      }
      await onSaved();
    } catch (err) {
      onError(apiErr(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={editing ? 'تعديل سؤال' : 'إضافة سؤال'} onClose={onClose} maxWidth="max-w-4xl">
      <form onSubmit={submit}>
        <div className="space-y-4">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="نص السؤال" className={fieldClassName} />
          <div className="grid gap-3 md:grid-cols-3">
            <input type="number" min={0.1} step="0.1" value={points} onChange={(e) => setPoints(e.target.value)} placeholder="points" className={fieldClassName} />
            <input type="number" value={position} onChange={(e) => setPosition(e.target.value)} placeholder="position" className={fieldClassName} />
            <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="image_url" className={fieldClassName} dir="ltr" />
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

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <button type="button" onClick={addChoice} className="text-xs font-black text-blue-600">
                + إضافة اختيار
              </button>
              <p className="text-right text-xs font-black text-zinc-500">الاختيارات</p>
            </div>
            {choices.map((choice, index) => (
              <div key={index} className="grid gap-2 sm:grid-cols-[2.5rem_1fr_2.5rem]">
                <button
                  type="button"
                  onClick={() => setCorrectIndex(index)}
                  className="rounded-xl border border-zinc-200 text-zinc-500 transition hover:bg-zinc-50 dark:border-zinc-800"
                  aria-label="تحديد الإجابة الصحيحة"
                >
                  {correctIndex === index ? (
                    <CheckCircle2 className="mx-auto h-4 w-4 text-emerald-600" />
                  ) : (
                    <Circle className="mx-auto h-4 w-4" />
                  )}
                </button>
                <input
                  value={choice}
                  onChange={(e) =>
                    setChoices((prev) => prev.map((item, i) => (i === index ? e.target.value : item)))
                  }
                  placeholder={`اختيار ${index + 1}`}
                  className={fieldClassName}
                />
                <button
                  type="button"
                  onClick={() => removeChoice(index)}
                  disabled={choices.length <= 2}
                  className="rounded-xl text-red-500 transition hover:bg-red-50 disabled:opacity-40 dark:hover:bg-red-950/30"
                  aria-label="حذف اختيار"
                >
                  <X className="mx-auto h-4 w-4" />
                </button>
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

function ImportModal({
  testId,
  onClose,
  onImported,
  onError,
}: {
  testId: number;
  onClose: () => void;
  onImported: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const [questions, setQuestions] = useState<QuestionListItem[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [points, setPoints] = useState('1');
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
    const numericPoints = asNumber(points);
    if (selected.length === 0 || !numericPoints) {
      onError('اختر أسئلة وحدد نقاط كل سؤال');
      return;
    }
    setBusy(true);
    try {
      await placement.importPlacementQuestionsFromLibrary(testId, {
        question_ids: selected,
        points_per_question: numericPoints,
        start_position: asOptionalNumber(startPosition),
      });
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
        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_8rem_10rem]">
          <div className="rounded-2xl bg-zinc-50 px-4 py-3 text-right text-sm text-zinc-500 dark:bg-zinc-950">
            المختار الآن: <span className="font-black text-zinc-900 dark:text-white">{selected.length}</span>
          </div>
          <input type="number" min={0.1} step="0.1" value={points} onChange={(e) => setPoints(e.target.value)} placeholder="points" className={fieldClassName} />
          <input type="number" value={startPosition} onChange={(e) => setStartPosition(e.target.value)} placeholder="start_position" className={fieldClassName} />
        </div>
        {loading ? (
          <LoadingState text="جاري تحميل مكتبة الأسئلة..." />
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
                      {question.prompt_text || 'سؤال بدون نص'}
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

function AttemptDetailModal({
  detail,
  onClose,
}: {
  detail: placement.PlacementAttemptDetail;
  onClose: () => void;
}) {
  return (
    <Modal title="تفاصيل محاولة الطالب" onClose={onClose} maxWidth="max-w-4xl">
      <div className="grid gap-3 md:grid-cols-4">
        <InfoTile label="الطالب" value={detail.student.name} />
        <InfoTile label="الدرجة" value={`${detail.score}/${detail.max_score}`} />
        <InfoTile label="النسبة" value={`${detail.percentage}%`} />
        <InfoTile label="المستوى" value={detail.placement_level?.name ?? 'بدون مستوى'} />
      </div>
      <div className="mt-5">
        <h3 className="mb-3 text-right text-sm font-black text-zinc-700 dark:text-zinc-200">
          الأخطاء ({detail.mistakes_count})
        </h3>
        {detail.mistakes.length === 0 ? (
          <EmptyState text="لا توجد أخطاء في هذه المحاولة." />
        ) : (
          <div className="space-y-3">
            {detail.mistakes.map((mistake) => (
              <div key={mistake.question_id} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-right dark:border-zinc-800 dark:bg-zinc-950">
                <p className="font-black text-zinc-950 dark:text-white">{mistake.question_text}</p>
                <p className="mt-2 text-sm text-red-500">
                  إجابة الطالب: {mistake.your_choice?.text ?? '—'}
                </p>
                <p className="mt-1 text-sm text-emerald-600">
                  الإجابة الصحيحة: {mistake.correct_answer?.text ?? '—'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-right dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-lg font-black text-zinc-950 dark:text-white">{value}</p>
      <p className="mt-1 text-xs font-bold text-zinc-500">{label}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="mt-5 rounded-3xl border border-dashed border-zinc-300 py-12 text-center text-sm text-zinc-500 dark:border-zinc-700">
      {text}
    </p>
  );
}

function LoadingState({ text }: { text: string }) {
  return (
    <div className="mt-5 rounded-3xl border border-dashed border-zinc-300 py-12 text-center text-zinc-500 dark:border-zinc-700">
      <Loader2 className="mx-auto mb-3 h-7 w-7 animate-spin" />
      {text}
    </div>
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
      <button type="button" className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-label="إغلاق" onClick={onClose} />
      <div className={`relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-3xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 ${maxWidth}`}>
        <div className="mb-5 flex items-start justify-between gap-3">
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
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
      <button type="button" className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-label="إلغاء" onClick={onCancel} disabled={busy} />
      <div className="relative z-10 w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-5 text-right shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-black text-zinc-950 dark:text-white">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-500">{message}</p>
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={onCancel} disabled={busy} className="inline-flex items-center justify-center rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-black text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800">
            إلغاء
          </button>
          <button type="button" onClick={onConfirm} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:opacity-60">
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

const primarySmallButtonClassName =
  'inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-blue-700 disabled:opacity-60';

const secondarySmallButtonClassName =
  'inline-flex items-center justify-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-black text-orange-700 transition hover:bg-orange-100 disabled:opacity-60 dark:border-orange-900/50 dark:bg-orange-950/20 dark:text-orange-300';

const ghostSmallButtonClassName =
  'inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 px-4 py-2.5 text-sm font-black text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800';

const iconButtonClassName =
  'rounded-xl p-2 text-blue-600 transition hover:bg-blue-50 dark:hover:bg-blue-950/30';

const dangerIconButtonClassName =
  'rounded-xl p-2 text-red-600 transition hover:bg-red-50 dark:hover:bg-red-950/30';
