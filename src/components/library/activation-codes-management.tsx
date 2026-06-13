'use client';

import {
  CheckCircle2,
  Clipboard,
  Download,
  KeyRound,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  type LucideIcon,
  UserCheck,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import cardBackground from '@/image/1466ff1c-84ac-48bd-93fb-7eef207399d7.png';
import { fetchAdminCourses, type AdminCourse } from '@/lib/admin-courses-api';
import {
  createActivationCodes,
  fetchActivationCodes,
  type ActivationCodeRow,
} from '@/lib/activation-codes-api';
import { apiErr } from '@/lib/library-errors';

function formatDate(value: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ar-EG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function statusLabel(status: string) {
  return status === 'unused'
    ? 'غير مستخدم'
    : status === 'used'
      ? 'مستخدم'
      : status;
}

function formatActivationCode(code: string) {
  const clean = code.replace(/\D/g, '');
  if (clean.length === 8) return `${clean.slice(0, 4)} ${clean.slice(4)}`;
  return code;
}

function sanitizeFileName(value: string) {
  return value
    .trim()
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, '-')
    .slice(0, 70);
}

function loadCanvasImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('تعذر تحميل صورة خلفية الكارت'));
    image.src = src;
  });
}

function addRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number
) {
  const scale = Math.max(width / image.width, height / image.height);
  const scaledWidth = image.width * scale;
  const scaledHeight = image.height * scale;
  ctx.drawImage(
    image,
    (width - scaledWidth) / 2,
    (height - scaledHeight) / 2,
    scaledWidth,
    scaledHeight
  );
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number
) {
  const words = text.split(/\s+/).filter(Boolean);
  let line = '';
  let currentY = y;
  let drawnLines = 0;

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(
        drawnLines === maxLines - 1 ? `${line}...` : line,
        x,
        currentY
      );
      drawnLines += 1;
      if (drawnLines >= maxLines) return currentY;
      line = word;
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }

  if (line && drawnLines < maxLines) {
    ctx.fillText(line, x, currentY);
  }
  return currentY;
}

async function renderActivationCardImage({
  courseTitle,
  code,
}: {
  courseTitle: string;
  code: string;
}) {
  const width = 1012;
  const height = 638;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('تعذر إنشاء صورة الكارت');

  const bg = await loadCanvasImage(cardBackground.src);

  addRoundedRect(ctx, 0, 0, width, height, 44);
  ctx.clip();
  ctx.fillStyle = '#f8fbff';
  ctx.fillRect(0, 0, width, height);
  drawCoverImage(ctx, bg, width, height);

  const blueOverlay = ctx.createLinearGradient(width, 0, 0, height);
  blueOverlay.addColorStop(0, 'rgba(0, 63, 140, 0.88)');
  blueOverlay.addColorStop(0.52, 'rgba(0, 63, 140, 0.36)');
  blueOverlay.addColorStop(1, 'rgba(255, 111, 0, 0.22)');
  ctx.fillStyle = blueOverlay;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  addRoundedRect(ctx, 58, 56, 896, 176, 34);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.38)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 30px Arial';
  ctx.fillText('كارت تفعيل الكورس', 908, 111);
  ctx.font = '900 52px Arial';
  drawWrappedText(ctx, courseTitle, 908, 176, 810, 58, 2);

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.22)';
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 14;
  addRoundedRect(ctx, 70, 356, 872, 188, 38);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
  ctx.fill();
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff6b00';
  ctx.font = '900 30px Arial';
  ctx.fillText('كود التفعيل', width / 2, 416);
  ctx.direction = 'ltr';
  ctx.fillStyle = '#003f8c';
  ctx.font = '900 86px Arial';
  ctx.fillText(formatActivationCode(code), width / 2, 507);

  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.font = '700 24px Arial';
  ctx.fillText('Mohamed Saber Math Tutor', 908, 594);
  ctx.textAlign = 'left';
  ctx.fillText('One-time activation', 92, 594);

  return canvas.toDataURL('image/png');
}

export function ActivationCodesManagement({
  initialCourseId,
  compact = false,
}: {
  initialCourseId?: number;
  compact?: boolean;
}) {
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [courseId, setCourseId] = useState(
    initialCourseId ? String(initialCourseId) : ''
  );
  const [codes, setCodes] = useState<ActivationCodeRow[]>([]);
  const [createdCodes, setCreatedCodes] = useState<string[]>([]);
  const [count, setCount] = useState('1');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [codesLoading, setCodesLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const selectedCourseId = Number(courseId);
  const selectedCourse = courses.find((course) => course.id === selectedCourseId);

  async function loadCourses() {
    setBanner(null);
    setLoading(true);
    try {
      const list = await fetchAdminCourses();
      setCourses(list);
      if (!courseId && list[0]) {
        setCourseId(String(list[0].id));
      }
    } catch (e) {
      setBanner(apiErr(e));
    } finally {
      setLoading(false);
    }
  }

  async function loadCodes(id = selectedCourseId) {
    if (!Number.isFinite(id) || id < 1) return;
    setBanner(null);
    setCodesLoading(true);
    try {
      setCodes(await fetchActivationCodes(id));
    } catch (e) {
      setBanner(apiErr(e));
      setCodes([]);
    } finally {
      setCodesLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const list = await fetchAdminCourses();
        if (cancelled) return;
        setCourses(list);
        if (initialCourseId) {
          setCourseId(String(initialCourseId));
        } else if (list[0]) {
          setCourseId(String(list[0].id));
        }
      } catch (e) {
        if (!cancelled) setBanner(apiErr(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialCourseId]);

  useEffect(() => {
    if (!courseId) return;
    let cancelled = false;
    void (async () => {
      setBanner(null);
      setCodesLoading(true);
      try {
        const list = await fetchActivationCodes(Number(courseId));
        if (!cancelled) setCodes(list);
      } catch (e) {
        if (!cancelled) {
          setBanner(apiErr(e));
          setCodes([]);
        }
      } finally {
        if (!cancelled) setCodesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  const filteredCodes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return codes;
    return codes.filter(
      (row) =>
        row.code.includes(q) ||
        row.status.toLowerCase().includes(q) ||
        (row.used_by?.name?.toLowerCase().includes(q) ?? false) ||
        (row.used_by?.email?.toLowerCase().includes(q) ?? false) ||
        (row.used_by?.phone?.toLowerCase().includes(q) ?? false)
    );
  }, [codes, search]);

  const usedCount = codes.filter((row) => row.status === 'used').length;
  const unusedCount = codes.filter((row) => row.status !== 'used').length;

  async function generateCodes(e: React.FormEvent) {
    e.preventDefault();
    const parsedCount = Number(count);
    if (!Number.isFinite(selectedCourseId) || selectedCourseId < 1) {
      setBanner('اختر كورس أولاً');
      return;
    }
    if (!Number.isInteger(parsedCount) || parsedCount < 1 || parsedCount > 500) {
      setBanner('عدد الأكواد يجب أن يكون بين 1 و 500');
      return;
    }
    setBanner(null);
    setCreating(true);
    try {
      const res = await createActivationCodes(selectedCourseId, parsedCount);
      setCreatedCodes(res.codes);
      await loadCodes(selectedCourseId);
    } catch (e) {
      setBanner(apiErr(e));
    } finally {
      setCreating(false);
    }
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setBanner('تم نسخ الكود');
    } catch {
      setBanner('تعذر النسخ من المتصفح');
    }
  }

  async function copyAllCreated() {
    if (!createdCodes.length) return;
    await copyText(createdCodes.join('\n'));
  }

  async function downloadActivationCard(code: string) {
    const courseTitle = selectedCourse?.title ?? 'course';
    try {
      const dataUrl = await renderActivationCardImage({ courseTitle, code });
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `activation-card-${sanitizeFileName(courseTitle)}-${code}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setBanner('تم تجهيز صورة الكارت للتحميل');
    } catch (e) {
      setBanner(apiErr(e));
    }
  }

  async function downloadAllCreatedCards() {
    for (const code of createdCodes) {
      await downloadActivationCard(code);
    }
  }

  return (
    <div
      className={
        compact ? 'mt-6' : 'mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10'
      }
    >
      {!compact && (
        <section className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="bg-gradient-to-l from-blue-600 via-blue-500 to-orange-500 px-6 py-7 text-white md:px-8">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur">
            <KeyRound className="h-4 w-4" />
            /api/admin/course-management/courses/:courseId/activation-codes
          </p>
          <h1 className="mt-4 text-3xl font-black tracking-tight md:text-4xl">
            إدارة أكواد التفعيل
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/85">
            أنشئ أكواد مكوّنة من 8 أرقام مرتبطة بكورس محدد. الكود يستخدم مرة
            واحدة فقط ويجب أن يطابق `course_id` عند تفعيل الطالب.
          </p>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-3 md:p-6">
          <StatCard icon={KeyRound} label="إجمالي الأكواد" value={codes.length} />
          <StatCard icon={ShieldCheck} label="غير مستخدمة" value={unusedCount} />
          <StatCard icon={UserCheck} label="مستخدمة" value={usedCount} />
        </div>
      </section>
      )}

      {compact && (
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard icon={KeyRound} label="إجمالي الأكواد" value={codes.length} />
          <StatCard icon={ShieldCheck} label="غير مستخدمة" value={unusedCount} />
          <StatCard icon={UserCheck} label="مستخدمة" value={usedCount} />
        </div>
      )}

      {banner && (
        <div
          className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-200"
          role="status"
        >
          {banner}
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[24rem_1fr]">
        <aside className="space-y-6">
          <form
            onSubmit={generateCodes}
            className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="text-right">
              <h2 className="text-xl font-black text-zinc-950 dark:text-white">
                إنشاء أكواد جديدة
              </h2>
              <p className="mt-1 text-sm leading-6 text-zinc-500">
                أرسل <code>{'{}'}</code> لكود واحد أو{' '}
                <code>{'{ count }'}</code> حتى 500 كود.
              </p>
            </div>

            <label className="mt-5 block text-right">
              <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200">
                الكورس
              </span>
              <select
                value={courseId}
                onChange={(e) => {
                  setCreatedCodes([]);
                  setCourseId(e.target.value);
                }}
                disabled={loading}
                className={fieldClassName}
              >
                {loading ? (
                  <option>جاري تحميل الكورسات...</option>
                ) : courses.length === 0 ? (
                  <option>لا توجد كورسات</option>
                ) : (
                  courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))
                )}
              </select>
            </label>

            <label className="mt-4 block text-right">
              <span className="text-sm font-bold text-zinc-700 dark:text-zinc-200">
                عدد الأكواد
              </span>
              <input
                type="number"
                min={1}
                max={500}
                value={count}
                onChange={(e) => setCount(e.target.value)}
                className={fieldClassName}
              />
            </label>

            <button
              type="submit"
              disabled={creating || loading || courses.length === 0}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              إنشاء الأكواد
            </button>
          </form>

          {createdCodes.length > 0 && (
            <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-right shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/20">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void copyAllCreated()}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white"
                  >
                    <Clipboard className="h-4 w-4" />
                    نسخ الكل
                  </button>
                  <button
                    type="button"
                    onClick={() => void downloadAllCreatedCards()}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white"
                  >
                    <Download className="h-4 w-4" />
                    تحميل الكل
                  </button>
                </div>
                <div>
                  <h2 className="font-black text-emerald-950 dark:text-emerald-100">
                    كروت الأكواد المنشأة الآن
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-emerald-800 dark:text-emerald-200">
                    تظهر الأكواد في استجابة الإنشاء فقط، ويمكن تحميل كل كارت كصورة PNG.
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-4">
                {createdCodes.map((code) => (
                  <ActivationCodeCardPreview
                    key={code}
                    code={code}
                    courseTitle={selectedCourse?.title ?? 'الكورس'}
                    onCopy={() => void copyText(code)}
                    onDownload={() => void downloadActivationCard(code)}
                  />
                ))}
              </div>
            </section>
          )}
        </aside>

        <main className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void loadCourses()}
                className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
              >
                <RefreshCw className="h-4 w-4" />
                تحديث الكورسات
              </button>
              <button
                type="button"
                onClick={() => void loadCodes()}
                disabled={!selectedCourseId || codesLoading}
                className="inline-flex items-center gap-2 rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-zinc-800 disabled:opacity-60 dark:bg-white dark:text-zinc-900"
              >
                {codesLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                تحديث الأكواد
              </button>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-black text-zinc-950 dark:text-white">
                أكواد الكورس
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                {selectedCourse?.title ?? 'اختر كورسًا لعرض الأكواد'}
              </p>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950">
            <Search className="h-4 w-4 shrink-0 text-zinc-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالكود أو حالة الاستخدام أو الطالب..."
              className="min-w-0 flex-1 bg-transparent text-right text-sm outline-none placeholder:text-zinc-400 dark:text-zinc-100"
            />
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
            {codesLoading ? (
              <div className="py-16 text-center text-zinc-500">
                <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin" />
                جاري تحميل الأكواد...
              </div>
            ) : filteredCodes.length === 0 ? (
              <div className="py-16 text-center text-zinc-500">
                <Lock className="mx-auto mb-3 h-10 w-10 text-zinc-400" />
                لا توجد أكواد مطابقة.
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredCodes.map((row) => {
                  const used = row.status === 'used';
                  return (
                    <div
                      key={row.id}
                      className="grid gap-4 p-4 text-right md:grid-cols-[10rem_1fr_8rem]"
                    >
                      <button
                        type="button"
                        onClick={() => void copyText(row.code)}
                        className="rounded-2xl bg-zinc-50 px-4 py-3 font-mono text-lg font-black tracking-[0.25em] text-zinc-900 transition hover:bg-zinc-100 dark:bg-zinc-950 dark:text-zinc-100"
                      >
                        {row.code}
                      </button>
                      <div className="min-w-0">
                        <div className="flex flex-wrap justify-end gap-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black ${
                              used
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                            }`}
                          >
                            {used && <CheckCircle2 className="h-3.5 w-3.5" />}
                            {statusLabel(row.status)}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-zinc-500">
                          الإنشاء: {formatDate(row.created_at)}
                        </p>
                        <p className="mt-1 text-sm text-zinc-500">
                          الاستخدام: {formatDate(row.used_at)}
                        </p>
                        {row.used_by && (
                          <p className="mt-2 text-sm font-bold text-zinc-700 dark:text-zinc-200">
                            استخدمه: {row.used_by.name}
                            {row.used_by.email ? ` · ${row.used_by.email}` : ''}
                          </p>
                        )}
                      </div>
                      <div className="grid gap-2">
                        <button
                          type="button"
                          onClick={() => void copyText(row.code)}
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-zinc-200 px-4 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        >
                          <Clipboard className="h-4 w-4" />
                          نسخ
                        </button>
                        <button
                          type="button"
                          onClick={() => void downloadActivationCard(row.code)}
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700"
                        >
                          <Download className="h-4 w-4" />
                          كارت
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function ActivationCodeCardPreview({
  courseTitle,
  code,
  onCopy,
  onDownload,
}: {
  courseTitle: string;
  code: string;
  onCopy: () => void;
  onDownload: () => void;
}) {
  return (
    <div className="rounded-3xl bg-white p-3 shadow-sm dark:bg-zinc-950">
      <div
        className="relative aspect-[1012/638] overflow-hidden rounded-[1.4rem] bg-cover bg-center shadow-xl"
        style={{ backgroundImage: `url(${cardBackground.src})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950/90 via-blue-700/45 to-orange-500/25" />
        <div className="absolute inset-x-5 top-5 rounded-3xl border border-white/35 bg-white/15 p-4 text-right text-white shadow-lg backdrop-blur-[2px]">
          <p className="text-xs font-black opacity-90">كارت تفعيل الكورس</p>
          <h3 className="mt-2 line-clamp-2 text-xl font-black leading-7">
            {courseTitle}
          </h3>
        </div>
        <div className="absolute inset-x-5 bottom-14 rounded-3xl bg-white/95 p-4 text-center shadow-2xl">
          <p className="text-xs font-black text-orange-500">كود التفعيل</p>
          <p className="mt-1 font-mono text-3xl font-black tracking-[0.18em] text-blue-900">
            {formatActivationCode(code)}
          </p>
        </div>
        <p className="absolute bottom-4 right-6 text-xs font-bold text-white/90">
          Mohamed Saber Math Tutor
        </p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 px-3 py-2 text-xs font-black text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
        >
          <Clipboard className="h-4 w-4" />
          نسخ الكود
        </button>
        <button
          type="button"
          onClick={onDownload}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-3 py-2 text-xs font-black text-white transition hover:bg-blue-700"
        >
          <Download className="h-4 w-4" />
          تحميل صورة
        </button>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-right dark:border-zinc-800 dark:bg-zinc-950">
      <Icon className="ms-auto h-5 w-5 text-blue-500" />
      <p className="mt-3 text-2xl font-black text-zinc-950 dark:text-white">
        {value.toLocaleString('ar-EG')}
      </p>
      <p className="text-xs font-bold text-zinc-500">{label}</p>
    </div>
  );
}

const fieldClassName =
  'mt-1 w-full rounded-2xl border border-zinc-300 bg-white px-3 py-2 text-right text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100';
