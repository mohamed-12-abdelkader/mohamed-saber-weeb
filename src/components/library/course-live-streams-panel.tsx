'use client';

import {
  CalendarClock,
  Camera,
  Copy,
  ExternalLink,
  Hand,
  Loader2,
  MessageSquare,
  Mic,
  MonitorUp,
  Pencil,
  Play,
  Plus,
  Radio,
  RefreshCw,
  ShieldCheck,
  Square,
  Users,
  Video,
  X,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { apiErr } from '@/lib/library-errors';
import {
  createCourseLiveSession,
  createLiveStream,
  endLiveStream,
  fetchCourseLiveStreams,
  fetchLiveStreamJoinInfo,
  startLiveStream,
  updateLiveStream,
  type CourseLiveStream,
  type LiveStreamJoinInfo,
  type LiveStreamMode,
  type LiveStreamStartType,
} from '@/lib/live-streams-api';

function toDatetimeLocal(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 16);
}

function fromDatetimeLocal(value: string) {
  return new Date(value).toISOString();
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });
}

function modeLabel(mode: LiveStreamMode) {
  if (mode === 'audio_only') return 'صوت فقط';
  if (mode === 'screen_share') return 'مشاركة شاشة';
  return 'صوت وفيديو';
}

function statusLabel(status: string) {
  if (status === 'scheduled') return 'مجدول';
  if (status === 'live') return 'مباشر الآن';
  if (status === 'ended') return 'منتهي';
  if (status === 'recorded') return 'مسجل';
  return status;
}

function statusClassName(status: string) {
  if (status === 'live') {
    return 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300';
  }
  if (status === 'scheduled') {
    return 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300';
  }
  if (status === 'ended') {
    return 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300';
  }
  return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300';
}

export function CourseLiveStreamsPanel({ courseId }: { courseId: number }) {
  const [streams, setStreams] = useState<CourseLiveStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<string | null>(null);
  const [modal, setModal] = useState<
    { mode: 'create' } | { mode: 'edit'; stream: CourseLiveStream } | null
  >(null);
  const [joinInfo, setJoinInfo] = useState<LiveStreamJoinInfo | null>(null);
  const [joinLoadingId, setJoinLoadingId] = useState<number | null>(null);
  const [actionBusyId, setActionBusyId] = useState<number | null>(null);

  const liveCount = streams.filter((stream) => stream.status === 'live').length;
  const scheduledCount = streams.filter((stream) => stream.status === 'scheduled').length;
  const endedCount = streams.filter((stream) => stream.status === 'ended').length;

  async function loadStreams() {
    setLoading(true);
    setBanner(null);
    try {
      setStreams(await fetchCourseLiveStreams(courseId));
    } catch (e) {
      setBanner(apiErr(e));
    } finally {
      setLoading(false);
    }
  }

  async function startStream(streamId: number) {
    setActionBusyId(streamId);
    setBanner(null);
    try {
      await startLiveStream(streamId);
      await loadStreams();
    } catch (e) {
      setBanner(apiErr(e));
    } finally {
      setActionBusyId(null);
    }
  }

  async function endStream(streamId: number) {
    setActionBusyId(streamId);
    setBanner(null);
    try {
      await endLiveStream(streamId);
      await loadStreams();
    } catch (e) {
      setBanner(apiErr(e));
    } finally {
      setActionBusyId(null);
    }
  }

  async function openJoinInfo(streamId: number) {
    setJoinLoadingId(streamId);
    setBanner(null);
    try {
      setJoinInfo(await fetchLiveStreamJoinInfo(streamId));
    } catch (e) {
      setBanner(apiErr(e));
    } finally {
      setJoinLoadingId(null);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadInitialStreams() {
      try {
        const nextStreams = await fetchCourseLiveStreams(courseId);
        if (!cancelled) {
          setStreams(nextStreams);
        }
      } catch (e) {
        if (!cancelled) {
          setBanner(apiErr(e));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadInitialStreams();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  return (
    <section className="mt-6 space-y-5">
      <div className="relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-red-600 via-orange-500 to-zinc-950 p-5 text-white shadow-xl shadow-orange-500/20">
        <div className="absolute -start-16 -top-16 h-44 w-44 rounded-full bg-white/10" />
        <div className="absolute -bottom-20 end-16 h-48 w-48 rounded-full bg-blue-400/20" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="text-right">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-black">
              <Radio className="h-3.5 w-3.5" />
              Live Streaming
            </span>
            <h2 className="mt-4 text-2xl font-black md:text-3xl">الحصص المباشرة</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-white/85">
              أنشئ جلسة Live سريعة من داخل الكورس، ابدأ الحصة، واستخرج بيانات الغرفة للشات وطلب التحدث وإدارة المشاركين.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModal({ mode: 'create' })}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-orange-700 shadow-lg transition hover:bg-orange-50"
          >
            <Plus className="h-5 w-5" />
            إنشاء جلسة
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <LiveStat label="مباشر الآن" value={liveCount} tone="red" />
        <LiveStat label="مجدول" value={scheduledCount} tone="blue" />
        <LiveStat label="منتهي" value={endedCount} tone="zinc" />
      </div>

      <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={loadStreams}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 px-4 py-2.5 text-sm font-black text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </button>
          <div className="text-right">
            <h3 className="text-xl font-black text-zinc-950 dark:text-white">بثوث الكورس</h3>
            <p className="mt-1 text-sm text-zinc-500">مرتبة حسب موعد البث الأحدث.</p>
          </div>
        </div>

        {banner && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-right text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            {banner}
          </div>
        )}

        {loading ? (
          <div className="mt-5 rounded-3xl border border-dashed border-zinc-300 py-14 text-center text-zinc-500 dark:border-zinc-700">
            <Loader2 className="mx-auto mb-3 h-7 w-7 animate-spin" />
            جاري تحميل الحصص المباشرة...
          </div>
        ) : streams.length === 0 ? (
          <p className="mt-5 rounded-3xl border border-dashed border-zinc-300 py-14 text-center text-sm text-zinc-500 dark:border-zinc-700">
            لا توجد حصص مباشرة بعد. أنشئ جلسة بعنوان فقط وسيضبط السيرفر الإعدادات الافتراضية.
          </p>
        ) : (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {streams.map((stream) => (
              <LiveStreamCard
                key={stream.id}
                stream={stream}
                busy={actionBusyId === stream.id}
                joinBusy={joinLoadingId === stream.id}
                onEdit={() => setModal({ mode: 'edit', stream })}
                onStart={() => startStream(stream.id)}
                onEnd={() => endStream(stream.id)}
                onJoinInfo={() => openJoinInfo(stream.id)}
              />
            ))}
          </div>
        )}
      </div>

      {modal && (
        <LiveStreamModal
          courseId={courseId}
          state={modal}
          onClose={() => setModal(null)}
          onSaved={async () => {
            await loadStreams();
            setModal(null);
          }}
          onError={setBanner}
        />
      )}

      {joinInfo && <JoinInfoModal info={joinInfo} onClose={() => setJoinInfo(null)} />}
    </section>
  );
}

function LiveStat({ label, value, tone }: { label: string; value: number; tone: 'red' | 'blue' | 'zinc' }) {
  const toneClass = {
    red: 'text-red-600 bg-red-50 dark:bg-red-950/20 dark:text-red-300',
    blue: 'text-blue-600 bg-blue-50 dark:bg-blue-950/20 dark:text-blue-300',
    zinc: 'text-zinc-600 bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-300',
  }[tone];

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-5 text-right shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <p className={`inline-flex rounded-2xl px-3 py-1 text-xs font-black ${toneClass}`}>
        {label}
      </p>
      <p className="mt-3 text-3xl font-black text-zinc-950 dark:text-white">{value}</p>
    </div>
  );
}

function LiveStreamCard({
  stream,
  busy,
  joinBusy,
  onEdit,
  onStart,
  onEnd,
  onJoinInfo,
}: {
  stream: CourseLiveStream;
  busy: boolean;
  joinBusy: boolean;
  onEdit: () => void;
  onStart: () => void;
  onEnd: () => void;
  onJoinInfo: () => void;
}) {
  const canEdit = stream.status === 'scheduled';
  const canStart = stream.status === 'scheduled';
  const canEnd = stream.status === 'live';

  return (
    <article className="overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-50 text-right dark:border-zinc-800 dark:bg-zinc-950">
      <div className="border-b border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-start justify-between gap-3">
          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${statusClassName(stream.status)}`}>
            {statusLabel(stream.status)}
          </span>
          <div>
            <h4 className="text-lg font-black text-zinc-950 dark:text-white">{stream.title}</h4>
            <p className="mt-1 text-xs text-zinc-500">Room: {stream.room_name}</p>
          </div>
        </div>
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-zinc-500">
          {stream.description || 'لا يوجد وصف لهذا البث.'}
        </p>
      </div>

      <div className="grid gap-2 p-4 sm:grid-cols-2">
        <InfoPill icon={CalendarClock} label="الموعد" value={formatDate(stream.scheduled_at)} />
        <InfoPill icon={Video} label="نوع البث" value={modeLabel(stream.stream_mode)} />
        <InfoPill icon={Camera} label="الكاميرا" value={stream.host_camera_on ? 'مفعلة' : 'مغلقة'} />
        <InfoPill icon={Mic} label="المايك" value={stream.host_mic_on ? 'مفعل' : 'مغلق'} />
      </div>

      <div className="grid gap-2 border-t border-zinc-200 p-4 dark:border-zinc-800 sm:grid-cols-2">
        {canEdit && (
          <button type="button" onClick={onEdit} className={secondaryButtonClassName}>
            <Pencil className="h-4 w-4" />
            تعديل
          </button>
        )}
        {canStart && (
          <button type="button" onClick={onStart} disabled={busy} className={primaryButtonClassName}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            بدء البث
          </button>
        )}
        {canEnd && (
          <button type="button" onClick={onEnd} disabled={busy} className={dangerButtonClassName}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
            إنهاء البث
          </button>
        )}
        {stream.status === 'live' && (
          <Link
            href={`/library/live-streams/${stream.id}?courseId=${stream.course_id}&title=${encodeURIComponent(stream.title)}`}
            className={primaryButtonClassName}
          >
            <ExternalLink className="h-4 w-4" />
            دخول غرفة البث
          </Link>
        )}
        <button type="button" onClick={onJoinInfo} disabled={joinBusy} className={ghostButtonClassName}>
          {joinBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MonitorUp className="h-4 w-4" />}
          بيانات الغرفة
        </button>
      </div>
    </article>
  );
}

function InfoPill({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-row-reverse items-center gap-2">
        <Icon className="h-4 w-4 text-blue-600" />
        <span className="text-xs font-bold text-zinc-500">{label}</span>
      </div>
      <p className="mt-2 text-sm font-black text-zinc-900 dark:text-white">{value}</p>
    </div>
  );
}

function LiveStreamModal({
  courseId,
  state,
  onClose,
  onSaved,
  onError,
}: {
  courseId: number;
  state: { mode: 'create' } | { mode: 'edit'; stream: CourseLiveStream };
  onClose: () => void;
  onSaved: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const stream = state.mode === 'edit' ? state.stream : null;
  const [title, setTitle] = useState(stream?.title ?? '');
  const [description, setDescription] = useState(stream?.description ?? '');
  const [useAdvancedCreate, setUseAdvancedCreate] = useState(false);
  const [startType, setStartType] = useState<LiveStreamStartType>(
    stream ? 'scheduled' : 'scheduled'
  );
  const [scheduledAt, setScheduledAt] = useState(toDatetimeLocal(stream?.scheduled_at));
  const [streamMode, setStreamMode] = useState<LiveStreamMode>(stream?.stream_mode ?? 'audio_video');
  const [cameraOn, setCameraOn] = useState(stream?.host_camera_on ?? true);
  const [micOn, setMicOn] = useState(stream?.host_mic_on ?? true);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      onError('عنوان البث مطلوب');
      return;
    }

    setBusy(true);
    try {
      if (stream) {
        await updateLiveStream(stream.id, {
          title: title.trim(),
          description: description.trim() || null,
          scheduled_at: scheduledAt ? fromDatetimeLocal(scheduledAt) : undefined,
          stream_mode: streamMode,
          host_camera_on: cameraOn,
          host_mic_on: micOn,
        });
      } else if (!useAdvancedCreate) {
        await createCourseLiveSession(courseId, {
          title: title.trim(),
          description: description.trim() || null,
        });
      } else {
        await createLiveStream({
          course_id: courseId,
          title: title.trim(),
          description: description.trim() || null,
          start_type: startType,
          ...(scheduledAt ? { scheduled_at: fromDatetimeLocal(scheduledAt) } : {}),
          stream_mode: streamMode,
          host_camera_on: cameraOn,
          host_mic_on: micOn,
        });
      }
      await onSaved();
    } catch (err) {
      onError(apiErr(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={stream ? 'تعديل بث مباشر' : 'إنشاء جلسة بث'} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="عنوان البث"
            className={fieldClassName}
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="وصف البث"
            rows={3}
            className={fieldClassName}
          />

          {!stream && (
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-right text-sm leading-7 text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/25 dark:text-blue-200">
              المسار الافتراضي ينشئ جلسة مجدولة بعنوان فقط عبر
              <span className="mx-1 font-mono text-xs" dir="ltr">
                POST /api/courses/:courseId/live-streams
              </span>
              ويستخدم السيرفر إعدادات الصوت والفيديو الافتراضية.
            </div>
          )}

          {!stream && (
            <button
              type="button"
              onClick={() => setUseAdvancedCreate((value) => !value)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-black text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
            >
              {useAdvancedCreate ? 'إخفاء الإعدادات المتقدمة' : 'إظهار إعدادات متقدمة'}
            </button>
          )}

          {(stream || useAdvancedCreate) && (
            <div className="grid gap-2 sm:grid-cols-2">
              <TypeButton active={startType === 'scheduled'} onClick={() => setStartType('scheduled')}>
                بث مجدول
              </TypeButton>
              <TypeButton active={startType === 'now'} onClick={() => setStartType('now')}>
                ابدأ الآن
              </TypeButton>
            </div>
          )}
          {(stream || useAdvancedCreate) && startType === 'scheduled' && (
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className={fieldClassName}
            />
          )}
          {(stream || useAdvancedCreate) && (
            <>
              <div className="grid gap-2 sm:grid-cols-3">
                <TypeButton active={streamMode === 'audio_video'} onClick={() => setStreamMode('audio_video')}>
                  صوت وفيديو
                </TypeButton>
                <TypeButton active={streamMode === 'audio_only'} onClick={() => setStreamMode('audio_only')}>
                  صوت فقط
                </TypeButton>
                <TypeButton active={streamMode === 'screen_share'} onClick={() => setStreamMode('screen_share')}>
                  مشاركة شاشة
                </TypeButton>
              </div>
              <label className="flex cursor-pointer items-center justify-between rounded-2xl bg-zinc-50 px-4 py-3 text-sm font-bold dark:bg-zinc-950">
                <input type="checkbox" checked={cameraOn} onChange={(e) => setCameraOn(e.target.checked)} />
                كاميرا المضيف مفعلة
              </label>
              <label className="flex cursor-pointer items-center justify-between rounded-2xl bg-zinc-50 px-4 py-3 text-sm font-bold dark:bg-zinc-950">
                <input type="checkbox" checked={micOn} onChange={(e) => setMicOn(e.target.checked)} />
                مايك المضيف مفعل
              </label>
            </>
          )}
        </div>
        <button type="submit" disabled={busy} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-700 disabled:opacity-60">
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          حفظ
        </button>
      </form>
    </Modal>
  );
}

function TypeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-4 py-3 text-sm font-black transition ${
        active
          ? 'border-blue-600 bg-blue-600 text-white'
          : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200'
      }`}
    >
      {children}
    </button>
  );
}

function JoinInfoModal({ info, onClose }: { info: LiveStreamJoinInfo; onClose: () => void }) {
  const json = useMemo(() => JSON.stringify(info, null, 2), [info]);
  const joinPayload = useMemo(
    () => JSON.stringify({ stream_id: info.stream_id }, null, 2),
    [info.stream_id]
  );
  const mediaStatePayload = useMemo(
    () =>
      JSON.stringify(
        {
          stream_id: info.stream_id,
          camera_on: info.media_defaults.host_camera_on,
          mic_on: info.media_defaults.host_mic_on,
          screen_share_on: false,
        },
        null,
        2
      ),
    [info.media_defaults.host_camera_on, info.media_defaults.host_mic_on, info.stream_id]
  );
  const chatPayload = useMemo(
    () => JSON.stringify({ stream_id: info.stream_id, message: 'السلام عليكم' }, null, 2),
    [info.stream_id]
  );
  const speakRequestPayload = useMemo(
    () => JSON.stringify({ stream_id: info.stream_id }, null, 2),
    [info.stream_id]
  );
  const resolveSpeakingPayload = useMemo(
    () =>
      JSON.stringify(
        {
          stream_id: info.stream_id,
          request_id: 'speak_...',
          status: 'accepted',
          allow_camera: false,
        },
        null,
        2
      ),
    [info.stream_id]
  );
  const participantActionPayload = useMemo(
    () =>
      JSON.stringify(
        {
          stream_id: info.stream_id,
          target_socket_id: 'student-socket-id',
        },
        null,
        2
      ),
    [info.stream_id]
  );
  const roleLabel = info.can_publish ? 'Host - يمكنه النشر' : 'Viewer - مشاهدة فقط';
  const permissionSummary = info.can_publish
    ? 'صوت وفيديو ومشاركة شاشة'
    : 'مشاهدة فقط، ويمكن طلب فتح الميكروفون';

  async function copyJson() {
    await navigator.clipboard?.writeText(json);
  }

  return (
    <Modal title="بيانات غرفة البث" onClose={onClose} maxWidth="max-w-5xl">
      <div className="grid gap-3 md:grid-cols-4">
        <InfoPill icon={MonitorUp} label="وضع الاتصال" value={info.connection_mode} />
        <InfoPill icon={Radio} label="الغرفة" value={info.room_name} />
        <InfoPill icon={Camera} label="الدور" value={roleLabel} />
        <InfoPill icon={ShieldCheck} label="الصلاحيات" value={permissionSummary} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4 text-right dark:border-zinc-800 dark:bg-zinc-950">
          <h3 className="text-base font-black text-zinc-950 dark:text-white">مسار المضيف</h3>
          <p className="mt-2 text-sm leading-7 text-zinc-500">
            إذا كان `can_publish=true` فالواجهة تفتح الكاميرا أو مشاركة الشاشة من المتصفح، ثم ترسل حالة الميديا عبر حدث `host_media_state_update`.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <MiniState label="الكاميرا" active={info.media_defaults.host_camera_on} />
            <MiniState label="المايك" active={info.media_defaults.host_mic_on} />
            <MiniState label="الشاشة" active={false} />
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4 text-right dark:border-zinc-800 dark:bg-zinc-950">
          <h3 className="text-base font-black text-zinc-950 dark:text-white">مسار الطالب</h3>
          <p className="mt-2 text-sm leading-7 text-zinc-500">
            الطالب يدخل كـ `viewer`، يتابع المضيف من `peers`، يرسل الشات عبر `live_chat_message`، ويطلب فتح الميكروفون عبر `request_to_speak`.
          </p>
          <div className="mt-3 rounded-2xl bg-white px-4 py-3 text-sm font-black text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
            عند قبول الطلب يحصل الطالب على `can_publish_audio=true` فقط، ومشاركة الشاشة تظل للمضيف.
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <CodePanel
          title={`إرسال ${info.signaling.join_event}`}
          actionLabel="نسخ join payload"
          code={joinPayload}
        />
        <CodePanel
          title="إرسال host_media_state_update"
          actionLabel="نسخ media payload"
          code={mediaStatePayload}
        />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <CodePanel
          title="إرسال live_chat_message"
          actionLabel="نسخ chat payload"
          code={chatPayload}
        />
        <CodePanel
          title="إرسال request_to_speak"
          actionLabel="نسخ speak payload"
          code={speakRequestPayload}
        />
        <CodePanel
          title="إرسال resolve_speaking_request"
          actionLabel="نسخ resolve payload"
          code={resolveSpeakingPayload}
        />
        <CodePanel
          title="إرسال mute/remove/get/end"
          actionLabel="نسخ participant payload"
          code={participantActionPayload}
        />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <FeatureTile icon={MessageSquare} title="الشات" text="live_chat_message لحظي داخل الغرفة وغير محفوظ كـ REST." />
        <FeatureTile icon={Hand} title="طلب التحدث" text="request_to_speak ثم resolve_speaking_request من المضيف." />
        <FeatureTile icon={Users} title="المشاركون" text="get_participants وparticipants_updated لتحديث القائمة." />
        <FeatureTile icon={ShieldCheck} title="الإدارة" text="mute_participant وremove_participant وend_live_stream للمضيف." />
      </div>

      <div className="mt-5 rounded-3xl border border-zinc-200 bg-white p-4 text-right dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="text-base font-black text-zinc-950 dark:text-white">أحداث Socket.io المدعومة</h3>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <EventPill name={info.signaling.join_event} description="دخول الغرفة ويرجع participant وpeers." />
          <EventPill name={info.signaling.signal_event} description="تبادل offer/answer وICE candidates." />
          <EventPill name="host_media_state_update" description="تحديث الكاميرا والمايك ومشاركة الشاشة." />
          <EventPill name="live_chat_message" description="إرسال واستقبال رسائل الشات اللحظية." />
          <EventPill name="request_to_speak" description="طلب طالب فتح الميكروفون." />
          <EventPill name="resolve_speaking_request" description="قبول أو رفض طلب التحدث." />
          <EventPill name="mute_participant" description="إغلاق ميكروفون مشارك من المضيف." />
          <EventPill name="remove_participant" description="طرد مشارك من الجلسة الحالية." />
          <EventPill name="get_participants" description="جلب قائمة المشاركين الحالية." />
          <EventPill name="end_live_stream" description="إنهاء الجلسة من داخل الغرفة." />
          <EventPill name={info.signaling.leave_event} description="خروج المستخدم من الغرفة." />
          <EventPill name="peer_joined" description="إشعار بدخول مشارك جديد." />
          <EventPill name="host_media_state" description="تحديث حالة ميديا المضيف للمشاهدين." />
          <EventPill name="participants_updated" description="تحديث المشاركين أو صلاحياتهم." />
          <EventPill name="speaking_request_created" description="طلب تحدث جديد يصل للمضيف." />
          <EventPill name="speaking_request_resolved" description="نتيجة الطلب تصل للطالب." />
          <EventPill name="participant_permissions_updated" description="تحديث صلاحيات مشارك." />
          <EventPill name="participant_muted" description="تنبيه الطالب لإيقاف الميكروفون محليًا." />
          <EventPill name="removed_from_live_stream" description="إخراج الطالب من شاشة اللايف." />
          <EventPill name="live_stream_ended" description="تنبيه الجميع بانتهاء الجلسة." />
          <EventPill name="peer_left" description="إشعار بخروج مشارك من الغرفة." />
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-950 p-4 dark:border-zinc-800">
        <div className="mb-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={copyJson}
            className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-black text-white transition hover:bg-white/15"
          >
            <Copy className="h-3.5 w-3.5" />
            نسخ JSON
          </button>
          <p className="text-right text-xs font-black text-zinc-400">Connection payload</p>
        </div>
        <pre className="max-h-[52vh] overflow-auto text-left text-xs leading-5 text-zinc-100" dir="ltr">
          {json}
        </pre>
      </div>
      {info.livekit && (
        <p className="mt-3 rounded-2xl bg-emerald-50 px-4 py-3 text-right text-sm text-emerald-700 dark:bg-emerald-950/25 dark:text-emerald-300">
          LiveKit متاح لهذا البث ويمكن استخدام `url` و`token` للاتصال بالغرفة.
        </p>
      )}
      {!info.livekit && (
        <p className="mt-3 rounded-2xl bg-blue-50 px-4 py-3 text-right text-sm text-blue-700 dark:bg-blue-950/25 dark:text-blue-300">
          LiveKit غير مفعل حاليًا، لذلك الاتصال يتم عبر Socket.io/WebRTC على namespace `{info.signaling.namespace}`.
        </p>
      )}
    </Modal>
  );
}

function MiniState({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs font-bold text-zinc-500">{label}</p>
      <p className={`mt-1 text-sm font-black ${active ? 'text-emerald-600' : 'text-zinc-500'}`}>
        {active ? 'مفعل' : 'مغلق'}
      </p>
    </div>
  );
}

function EventPill({ name, description }: { name: string; description: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950">
      <p className="font-mono text-xs font-black text-blue-600 dark:text-blue-300" dir="ltr">
        {name}
      </p>
      <p className="mt-1 text-xs leading-5 text-zinc-500">{description}</p>
    </div>
  );
}

function FeatureTile({
  icon: Icon,
  title,
  text,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-4 text-right dark:border-zinc-800 dark:bg-zinc-900">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 dark:bg-orange-950/30 dark:text-orange-300">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-3 text-sm font-black text-zinc-950 dark:text-white">{title}</h3>
      <p className="mt-2 text-xs leading-6 text-zinc-500">{text}</p>
    </div>
  );
}

function CodePanel({
  title,
  actionLabel,
  code,
}: {
  title: string;
  actionLabel: string;
  code: string;
}) {
  async function copyCode() {
    await navigator.clipboard?.writeText(code);
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-950 p-4 dark:border-zinc-800">
      <div className="mb-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={copyCode}
          className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-black text-white transition hover:bg-white/15"
        >
          <Copy className="h-3.5 w-3.5" />
          {actionLabel}
        </button>
        <p className="text-right text-xs font-black text-zinc-400">{title}</p>
      </div>
      <pre className="overflow-auto text-left text-xs leading-5 text-zinc-100" dir="ltr">
        {code}
      </pre>
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
  children: ReactNode;
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

const fieldClassName =
  'w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-right text-sm outline-none transition placeholder:text-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100';

const primaryButtonClassName =
  'inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-blue-700 disabled:opacity-60';

const secondaryButtonClassName =
  'inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-black text-blue-700 transition hover:bg-blue-100 disabled:opacity-60 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300';

const dangerButtonClassName =
  'inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-700 disabled:opacity-60';

const ghostButtonClassName =
  'inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-black text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800';
