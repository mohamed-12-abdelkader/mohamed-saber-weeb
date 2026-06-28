'use client';

import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Circle,
  GitBranch,
  Layers,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { ModalBackdrop } from '@/components/library/library-modals';
import { apiErr } from '@/lib/library-errors';
import {
  fetchCourseGeneralExamsForCourse,
  fetchCourseLevelExamsForCourse,
  fetchCourseManagementCourses,
  importGeneralExamQuestionsFromLibrary,
  importLevelExamQuestionsFromLibrary,
  type CourseGeneralExam,
  type CourseLevelExamListItem,
  type CourseManagementListItem,
} from '@/lib/course-management-api';
import {
  fetchPlacementTests,
  importPlacementQuestionsFromLibrary,
  type PlacementTest,
} from '@/lib/placement-test-api';

export type ExportTargetType = 'placement' | 'level_exam' | 'general_exam';

function asOptionalNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function ExportTabButton({
  active,
  onClick,
  icon: Icon,
  label,
  activeClassName,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof GitBranch;
  label: string;
  activeClassName: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2.5 text-xs font-black transition ${
        active
          ? `${activeClassName} text-white shadow-md`
          : 'text-zinc-500 hover:bg-white/60 dark:text-zinc-400 dark:hover:bg-zinc-800/60'
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="text-center leading-tight">{label}</span>
    </button>
  );
}

function PickRow({
  active,
  onClick,
  accentTextClass,
  accentBorderClass,
  accentBgClass,
  children,
  meta,
}: {
  active: boolean;
  onClick: () => void;
  accentTextClass: string;
  accentBorderClass: string;
  accentBgClass: string;
  children: React.ReactNode;
  meta?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-start justify-between gap-3 rounded-xl border px-4 py-3 text-right transition ${
        active
          ? `${accentBorderClass} ${accentBgClass}`
          : 'border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800'
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className={`font-bold ${active ? accentTextClass : 'text-zinc-900 dark:text-white'}`}>
          {children}
        </div>
        {meta ? <div className="mt-1 text-xs text-zinc-500">{meta}</div> : null}
      </div>
      {active ? (
        <CheckCircle2 className={`mt-0.5 h-5 w-5 shrink-0 ${accentTextClass}`} />
      ) : (
        <Circle className="mt-0.5 h-5 w-5 shrink-0 text-zinc-400" />
      )}
    </button>
  );
}

function EmptyPickHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="text-right leading-6">{children}</span>
    </div>
  );
}

export function ImportSelectedQuestionsModal({
  courseId,
  questionIds,
  onClose,
  onImported,
}: {
  courseId: number;
  questionIds: number[];
  onClose: () => void;
  onImported: (message: string) => void;
}) {
  const [targetType, setTargetType] = useState<ExportTargetType>('placement');
  const [placementTests, setPlacementTests] = useState<PlacementTest[]>([]);
  const [courses, setCourses] = useState<CourseManagementListItem[]>([]);
  const [levelExams, setLevelExams] = useState<CourseLevelExamListItem[]>([]);
  const [generalExams, setGeneralExams] = useState<CourseGeneralExam[]>([]);
  const [exportCourseId, setExportCourseId] = useState(String(courseId));
  const [exportTargetId, setExportTargetId] = useState('');
  const [exportPointsPerQuestion, setExportPointsPerQuestion] = useState('1');
  const [exportStartPosition, setExportStartPosition] = useState('');
  const [loadingTargets, setLoadingTargets] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const pickText = 'text-blue-600';
  const pickBorder = 'border-blue-300 dark:border-blue-800';
  const pickBg = 'bg-blue-50 dark:bg-blue-950/30';
  const levelText = 'text-orange-600';
  const levelBorder = 'border-orange-300 dark:border-orange-800';
  const levelBg = 'bg-orange-50 dark:bg-orange-950/30';
  const generalText = 'text-emerald-600';
  const generalBorder = 'border-emerald-300 dark:border-emerald-800';
  const generalBg = 'bg-emerald-50 dark:bg-emerald-950/30';
  const activePick =
    targetType === 'placement'
      ? { text: pickText, border: pickBorder, bg: pickBg }
      : targetType === 'level_exam'
      ? { text: levelText, border: levelBorder, bg: levelBg }
      : { text: generalText, border: generalBorder, bg: generalBg };
  const coursePick =
    targetType === 'general_exam'
      ? { text: generalText, border: generalBorder, bg: generalBg }
      : { text: levelText, border: levelBorder, bg: levelBg };

  const loadExportTargets = useCallback(async (type: ExportTargetType = targetType) => {
    setLoadingTargets(true);
    setErr(null);
    try {
      if (type === 'placement') {
        setPlacementTests(await fetchPlacementTests());
      } else {
        setCourses(await fetchCourseManagementCourses());
      }
    } catch (e) {
      if (type === 'placement') {
        setPlacementTests([]);
        setErr(apiErr(e));
      } else {
        setCourses([]);
        setErr(apiErr(e));
      }
    } finally {
      setLoadingTargets(false);
    }
  }, [targetType]);

  const loadLevelExamsForCourse = useCallback(async (selectedCourseId: number) => {
    setLoadingTargets(true);
    setErr(null);
    try {
      setLevelExams(await fetchCourseLevelExamsForCourse(selectedCourseId));
    } catch (e) {
      setLevelExams([]);
      setErr(apiErr(e));
    } finally {
      setLoadingTargets(false);
    }
  }, []);

  const loadGeneralExamsForCourse = useCallback(async (selectedCourseId: number) => {
    setLoadingTargets(true);
    setErr(null);
    try {
      setGeneralExams(await fetchCourseGeneralExamsForCourse(selectedCourseId));
    } catch (e) {
      setGeneralExams([]);
      setErr(apiErr(e));
    } finally {
      setLoadingTargets(false);
    }
  }, []);

  useEffect(() => {
    void loadExportTargets('placement');
  }, [loadExportTargets]);

  useEffect(() => {
    setExportTargetId('');
  }, [targetType]);

  useEffect(() => {
    setExportTargetId('');
    if (targetType === 'placement') return;
    setLevelExams([]);
    setGeneralExams([]);
  }, [exportCourseId, targetType]);

  useEffect(() => {
    if (targetType === 'placement' || !exportCourseId.trim()) return;
    const cid = Number(exportCourseId.trim());
    if (!Number.isInteger(cid) || cid <= 0) return;
    if (targetType === 'level_exam') void loadLevelExamsForCourse(cid);
    else if (targetType === 'general_exam') void loadGeneralExamsForCourse(cid);
  }, [exportCourseId, targetType, loadLevelExamsForCourse, loadGeneralExamsForCourse]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (questionIds.length === 0) {
      setErr('اختر سؤالًا واحدًا على الأقل.');
      return;
    }

    const targetId = Number(exportTargetId.trim());
    if (!Number.isInteger(targetId) || targetId <= 0) {
      const pickMsg =
        targetType === 'placement'
          ? 'اختر اختبار تحديد المستوى من القائمة.'
          : targetType === 'general_exam'
          ? 'اختر الامتحان العام من القائمة.'
          : 'اختر امتحان المستوى من القائمة.';
      setErr(pickMsg);
      return;
    }

    const startRaw = exportStartPosition.trim();
    const start_position = startRaw === '' ? undefined : Number(startRaw);
    if (
      targetType !== 'general_exam' &&
      startRaw !== '' &&
      (!Number.isInteger(start_position) || start_position! < 0)
    ) {
      setErr('start_position يجب أن يكون رقمًا صحيحًا أكبر أو يساوي صفر.');
      return;
    }

    setBusy(true);
    try {
      if (targetType === 'placement') {
        const pointsRaw = exportPointsPerQuestion.trim();
        const points = pointsRaw === '' ? 1 : Number(pointsRaw);
        if (!Number.isFinite(points) || points <= 0) {
          setErr('points_per_question يجب أن يكون رقمًا أكبر من صفر.');
          return;
        }
        const res = await importPlacementQuestionsFromLibrary(targetId, {
          question_ids: questionIds,
          points_per_question: points,
          ...(start_position != null ? { start_position } : {}),
        });
        onImported(`تم إضافة ${res.imported_count} سؤال لاختبار تحديد المستوى.`);
      } else if (targetType === 'general_exam') {
        const res = await importGeneralExamQuestionsFromLibrary(targetId, {
          question_ids: questionIds,
        });
        const n = res.imported_count ?? questionIds.length;
        onImported(`تم إضافة ${n} سؤال للامتحان العام.`);
      } else {
        const res = await importLevelExamQuestionsFromLibrary(targetId, {
          question_ids: questionIds,
          ...(start_position != null ? { start_position } : {}),
        });
        onImported(`تم إضافة ${res.imported_count} سؤال لامتحان المستوى.`);
      }
    } catch (e) {
      setErr(apiErr(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalBackdrop title="إضافة الأسئلة المحددة إلى امتحان" onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          الأسئلة المحددة: <strong className="text-zinc-900 dark:text-white">{questionIds.length}</strong>
        </p>

        <div className="flex gap-1 rounded-2xl border border-zinc-200 bg-zinc-100/80 p-1 dark:border-zinc-700 dark:bg-zinc-950/80">
          <ExportTabButton
            active={targetType === 'placement'}
            onClick={() => {
              setTargetType('placement');
              void loadExportTargets('placement');
            }}
            icon={GitBranch}
            label="تحديد المستوى"
            activeClassName="bg-blue-600"
          />
          <ExportTabButton
            active={targetType === 'level_exam'}
            onClick={() => {
              setTargetType('level_exam');
              setExportCourseId(String(courseId));
              void loadExportTargets('level_exam');
            }}
            icon={Layers}
            label="امتحان مستوى"
            activeClassName="bg-orange-500"
          />
          <ExportTabButton
            active={targetType === 'general_exam'}
            onClick={() => {
              setTargetType('general_exam');
              setExportCourseId(String(courseId));
              void loadExportTargets('general_exam');
            }}
            icon={BookOpen}
            label="امتحان عام"
            activeClassName="bg-emerald-600"
          />
        </div>

        <button
          type="button"
          onClick={() => void loadExportTargets(targetType)}
          disabled={loadingTargets}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-bold text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <RefreshCw className={`h-4 w-4 ${loadingTargets ? 'animate-spin' : ''}`} />
          {loadingTargets ? 'جاري تحديث الامتحانات...' : 'تحديث قائمة الامتحانات'}
        </button>

        {targetType === 'placement' ? (
          <>
            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-white">
                اختبارات تحديد المستوى من الخادم
              </h3>
              <p className="mt-1 text-sm leading-6 text-zinc-500">
                القائمة من مسار إدارة اختبارات التحديد على الخادم — اختر الاختبار؛ عند التأكيد
                يُرسل الطلب لاستيراد الأسئلة إلى ذلك الاختبار بالمعرف الذي اخترته.
              </p>
            </div>
            {loadingTargets && placementTests.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-zinc-500">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                جاري تحميل اختبارات تحديد المستوى...
              </div>
            ) : placementTests.length === 0 ? (
              <EmptyPickHint>
                لا توجد اختبارات تحديد مستوى. اضغط «تحديث قائمة الامتحانات» أو أنشئ اختباراً من
                إدارة التحديد.
              </EmptyPickHint>
            ) : (
              <div className="space-y-2">
                {placementTests.map((exam) => (
                  <PickRow
                    key={exam.id}
                    active={exportTargetId === String(exam.id)}
                    onClick={() => setExportTargetId(String(exam.id))}
                    accentTextClass={activePick.text}
                    accentBorderClass={activePick.border}
                    accentBgClass={activePick.bg}
                    meta={
                      <>
                        {exam.is_active ? 'نشط' : 'غير نشط'}
                        {` · ${exam.question_count ?? 0} سؤال`}
                      </>
                    }
                  >
                    #{exam.id} — {exam.title}
                  </PickRow>
                ))}
              </div>
            )}
          </>
        ) : targetType === 'level_exam' ? (
          <>
            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-white">
                اختر الكورس ثم امتحان المستوى
              </h3>
              <p className="mt-1 text-sm leading-6 text-zinc-500">
                تُحمَّل امتحانات المستوى من مسار الكورس بعد اختيار الكورس.
              </p>
            </div>
            <p className={`text-xs font-black ${coursePick.text}`}>1) اختر الكورس</p>
            {loadingTargets && courses.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-4 text-sm text-zinc-500">
                <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
                جاري تحميل الكورسات...
              </div>
            ) : courses.length === 0 ? (
              <EmptyPickHint>
                لا توجد كورسات حالياً. اضغط «تحديث قائمة الامتحانات».
              </EmptyPickHint>
            ) : (
              <div className="space-y-2">
                {courses.map((course) => (
                  <PickRow
                    key={course.id}
                    active={exportCourseId === String(course.id)}
                    onClick={() => setExportCourseId(String(course.id))}
                    accentTextClass={coursePick.text}
                    accentBorderClass={coursePick.border}
                    accentBgClass={coursePick.bg}
                  >
                    {course.title} (#{course.id})
                  </PickRow>
                ))}
              </div>
            )}
            <p className={`text-xs font-black ${exportCourseId ? activePick.text : 'text-zinc-400'}`}>
              2) اختر امتحان المستوى
            </p>
            {!exportCourseId ? (
              <EmptyPickHint>اختر الكورس أولاً لعرض امتحاناته.</EmptyPickHint>
            ) : loadingTargets && levelExams.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-4 text-sm text-zinc-500">
                <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
                جاري تحميل امتحانات المستوى...
              </div>
            ) : levelExams.length === 0 ? (
              <EmptyPickHint>
                لا توجد امتحانات مستوى لهذا الكورس. اختر كورساً آخر أو أنشئ امتحاناً من إدارة
                الكورس.
              </EmptyPickHint>
            ) : (
              <div className="ms-3 space-y-2">
                {levelExams.map((exam) => (
                  <PickRow
                    key={exam.id}
                    active={exportTargetId === String(exam.id)}
                    onClick={() => setExportTargetId(String(exam.id))}
                    accentTextClass={activePick.text}
                    accentBorderClass={activePick.border}
                    accentBgClass={activePick.bg}
                  >
                    #{exam.id} — {exam.title}
                  </PickRow>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-white">
                اختر الكورس ثم الامتحان العام
              </h3>
              <p className="mt-1 text-sm leading-6 text-zinc-500">
                تُحمَّل جميع الامتحانات العامة للكورس مع عدد الأسئلة لكل امتحان بعد اختيار
                الكورس.
              </p>
            </div>
            <p className={`text-xs font-black ${coursePick.text}`}>1) اختر الكورس</p>
            {loadingTargets && courses.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-4 text-sm text-zinc-500">
                <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                جاري تحميل الكورسات...
              </div>
            ) : courses.length === 0 ? (
              <EmptyPickHint>
                لا توجد كورسات حالياً. اضغط «تحديث قائمة الامتحانات».
              </EmptyPickHint>
            ) : (
              <div className="space-y-2">
                {courses.map((course) => (
                  <PickRow
                    key={course.id}
                    active={exportCourseId === String(course.id)}
                    onClick={() => setExportCourseId(String(course.id))}
                    accentTextClass={coursePick.text}
                    accentBorderClass={coursePick.border}
                    accentBgClass={coursePick.bg}
                  >
                    {course.title} (#{course.id})
                  </PickRow>
                ))}
              </div>
            )}
            <p className={`text-xs font-black ${exportCourseId ? activePick.text : 'text-zinc-400'}`}>
              2) اختر الامتحان العام
            </p>
            {!exportCourseId ? (
              <EmptyPickHint>اختر الكورس أولاً لعرض الامتحانات العامة.</EmptyPickHint>
            ) : loadingTargets && generalExams.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-4 text-sm text-zinc-500">
                <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                جاري تحميل الامتحانات العامة...
              </div>
            ) : generalExams.length === 0 ? (
              <EmptyPickHint>
                لا توجد امتحانات عامة لهذا الكورس. أنشئ امتحاناً عاماً من إدارة الكورس أو اختر
                كورساً آخر.
              </EmptyPickHint>
            ) : (
              <div className="ms-3 space-y-2">
                {generalExams.map((exam) => (
                  <PickRow
                    key={exam.id}
                    active={exportTargetId === String(exam.id)}
                    onClick={() => setExportTargetId(String(exam.id))}
                    accentTextClass={activePick.text}
                    accentBorderClass={activePick.border}
                    accentBgClass={activePick.bg}
                    meta={
                      <>
                        {exam.is_active !== false ? 'نشط' : 'غير نشط'}
                        {` · ${exam.question_count ?? 0} سؤال`}
                        {exam.duration_minutes != null ? ` · ${exam.duration_minutes} د` : ''}
                      </>
                    }
                  >
                    #{exam.id} — {exam.title}
                  </PickRow>
                ))}
              </div>
            )}
          </>
        )}

        {targetType !== 'general_exam' ? (
          <input
            value={exportStartPosition}
            onChange={(e) => setExportStartPosition(e.target.value)}
            placeholder="start_position (اختياري)"
            className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            dir="ltr"
          />
        ) : null}

        {targetType === 'placement' ? (
          <input
            value={exportPointsPerQuestion}
            onChange={(e) => setExportPointsPerQuestion(e.target.value)}
            placeholder="points_per_question (الافتراضي 1)"
            className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            dir="ltr"
          />
        ) : null}

        {err ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            {err}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy || loadingTargets}
          className={`inline-flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold text-white transition disabled:opacity-60 ${
            targetType === 'placement'
              ? 'bg-blue-600 hover:bg-blue-700'
              : targetType === 'level_exam'
              ? 'bg-orange-500 hover:bg-orange-600'
              : 'bg-emerald-600 hover:bg-emerald-700'
          }`}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {busy ? 'جاري الإضافة...' : 'تأكيد الإضافة للامتحان'}
        </button>
      </form>
    </ModalBackdrop>
  );
}
