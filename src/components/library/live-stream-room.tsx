'use client';

import {
  ArrowRight,
  Camera,
  Hand,
  Loader2,
  MessageSquare,
  Mic,
  MonitorUp,
  Send,
  VideoOff,
  X,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { apiErr } from '@/lib/library-errors';
import {
  endLiveStream,
  fetchLiveStreamJoinInfo,
  type LiveStreamJoinInfo,
} from '@/lib/live-streams-api';

type MediaState = {
  cameraOn: boolean;
  micOn: boolean;
  screenShareOn: boolean;
};

type LocalChatMessage = {
  id: number;
  message: string;
  createdAt: string;
};

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatConnectionMode(mode: string) {
  if (mode === 'socket_webrtc') return 'Socket.io + WebRTC';
  if (mode === 'hybrid') return 'Hybrid + LiveKit';
  return mode;
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

export function LiveStreamRoom() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawStreamId = readParam(params.streamId);
  const streamId = Number(rawStreamId);
  const courseId = searchParams.get('courseId');
  const title = searchParams.get('title') || 'غرفة البث المباشر';

  const [info, setInfo] = useState<LiveStreamJoinInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [media, setMedia] = useState<MediaState>({
    cameraOn: false,
    micOn: false,
    screenShareOn: false,
  });
  const [leaveBusy, setLeaveBusy] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatDraft, setChatDraft] = useState('');
  const [chatMessages, setChatMessages] = useState<LocalChatMessage[]>([]);
  const [speakRequested, setSpeakRequested] = useState(false);

  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadJoinInfo() {
      if (!Number.isFinite(streamId)) {
        setError('معرّف البث غير صالح');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const nextInfo = await fetchLiveStreamJoinInfo(streamId);
        if (cancelled) return;
        setInfo(nextInfo);
        setMedia({
          cameraOn: false,
          micOn: false,
          screenShareOn: false,
        });
      } catch (e) {
        if (!cancelled) setError(apiErr(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadJoinInfo();

    return () => {
      cancelled = true;
    };
  }, [streamId]);

  useEffect(() => {
    return () => {
      stopStream(cameraStreamRef.current);
      stopStream(screenStreamRef.current);
    };
  }, []);

  useEffect(() => {
    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = media.cameraOn ? cameraStreamRef.current : null;
    }

    if (screenVideoRef.current) {
      screenVideoRef.current.srcObject = media.screenShareOn ? screenStreamRef.current : null;
    }
  }, [media.cameraOn, media.screenShareOn]);

  async function applyCameraMedia(nextMedia: MediaState) {
    if (!info?.can_publish) return;

    setMediaBusy(true);
    setMediaError(null);
    try {
      if (!nextMedia.cameraOn && !nextMedia.micOn) {
        stopStream(cameraStreamRef.current);
        cameraStreamRef.current = null;
        if (cameraVideoRef.current) cameraVideoRef.current.srcObject = null;
        setMedia(nextMedia);
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setMediaError('المتصفح لا يدعم فتح الكاميرا أو الميكروفون.');
        return;
      }

      const nextStream = await navigator.mediaDevices.getUserMedia({
        video: nextMedia.cameraOn,
        audio: nextMedia.micOn,
      });
      stopStream(cameraStreamRef.current);
      cameraStreamRef.current = nextStream;
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = nextStream;
      }
      setMedia(nextMedia);
    } catch (e) {
      setMediaError(apiErr(e));
    } finally {
      setMediaBusy(false);
    }
  }

  async function toggleScreenShare() {
    if (!info?.can_publish) return;

    if (media.screenShareOn) {
      stopStream(screenStreamRef.current);
      screenStreamRef.current = null;
      if (screenVideoRef.current) screenVideoRef.current.srcObject = null;
      setMedia((current) => ({ ...current, screenShareOn: false }));
      return;
    }

    setMediaBusy(true);
    setMediaError(null);
    try {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        setMediaError('المتصفح لا يدعم مشاركة الشاشة.');
        return;
      }

      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      screenStreamRef.current = screenStream;
      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = screenStream;
      }
      screenStream.getVideoTracks()[0]?.addEventListener('ended', () => {
        screenStreamRef.current = null;
        if (screenVideoRef.current) screenVideoRef.current.srcObject = null;
        setMedia((current) => ({ ...current, screenShareOn: false }));
      });
      setMedia((current) => ({ ...current, screenShareOn: true }));
    } catch (e) {
      setMediaError(apiErr(e));
    } finally {
      setMediaBusy(false);
    }
  }

  function stopLocalMedia() {
    stopStream(cameraStreamRef.current);
    stopStream(screenStreamRef.current);
    cameraStreamRef.current = null;
    screenStreamRef.current = null;
    if (cameraVideoRef.current) cameraVideoRef.current.srcObject = null;
    if (screenVideoRef.current) screenVideoRef.current.srcObject = null;
    setMedia({ cameraOn: false, micOn: false, screenShareOn: false });
  }

  async function handleLeave() {
    if (!Number.isFinite(streamId)) return;

    setLeaveBusy(true);
    setMediaError(null);
    try {
      stopLocalMedia();
      await endLiveStream(streamId);
      router.push(backHref);
    } catch (e) {
      setMediaError(apiErr(e));
    } finally {
      setLeaveBusy(false);
    }
  }

  function sendLocalChatMessage() {
    const message = chatDraft.trim();
    if (!message) return;

    setChatMessages((current) => [
      ...current,
      {
        id: Date.now(),
        message,
        createdAt: new Date().toLocaleTimeString('ar-EG', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      },
    ]);
    setChatDraft('');
  }

  const backHref = courseId ? `/library/admin-courses/${courseId}` : '/library';
  const roleLabel = info?.can_publish ? 'Host - يمكنه النشر' : 'Viewer - مشاهدة فقط';
  const socketNamespace = info?.signaling.namespace ?? '/live-webrtc';

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-[#050816] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(37,99,235,0.18),transparent_34%),radial-gradient(circle_at_85%_85%,rgba(239,68,68,0.12),transparent_28%)]" />

      {loading ? (
        <div className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center text-zinc-400">
          <Loader2 className="mb-3 h-8 w-8 animate-spin" />
          جاري تجهيز بيانات غرفة البث...
        </div>
      ) : error ? (
        <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl items-center justify-center px-4">
          <div className="rounded-3xl border border-red-500/30 bg-red-950/40 p-6 text-center text-red-100">
            {error}
          </div>
        </div>
      ) : info ? (
        <div className="relative flex min-h-[calc(100vh-4rem)] flex-col px-4 py-5 md:px-7">
          <header className="flex items-start justify-between gap-4">
            <Link
              href={backHref}
              onClick={stopLocalMedia}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-black text-white/85 backdrop-blur transition hover:bg-white/10"
            >
              <ArrowRight className="h-4 w-4" />
              رجوع
            </Link>

            <div className="text-right">
              <span className="inline-flex items-center gap-2 rounded-full border border-red-400/20 bg-red-500/15 px-3 py-1 text-xs font-black text-red-200">
                <span className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_18px_rgba(239,68,68,0.95)]" />
                مباشر الآن
              </span>
              <h1 className="mt-2 text-xl font-black md:text-2xl">{title}</h1>
              <p className="mt-1 text-xs text-zinc-400">
                {roleLabel} · {formatConnectionMode(info.connection_mode)} · {socketNamespace}
              </p>
            </div>
          </header>

          <main className="flex min-h-0 flex-1 items-center justify-center pb-28 pt-6">
            <div
              className={`grid w-full max-w-6xl items-center gap-4 ${
                media.screenShareOn && media.cameraOn
                  ? 'lg:grid-cols-[minmax(0,1fr)_18rem]'
                  : 'justify-items-center'
              }`}
            >
              <div className="relative aspect-video w-full max-w-5xl overflow-hidden rounded-[1.7rem] border border-white/10 bg-[#09111f] shadow-2xl shadow-black/45 ring-1 ring-blue-400/10">
                {media.screenShareOn ? (
                  <video ref={screenVideoRef} autoPlay playsInline muted className="h-full w-full object-contain" />
                ) : media.cameraOn ? (
                  <video ref={cameraVideoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
                ) : (
                  <EmptyStage canPublish={info.can_publish} title={title} />
                )}

                <div className="absolute inset-x-4 top-4 flex items-center justify-between gap-3">
                  <span className="rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-xs font-black text-white/85 backdrop-blur">
                    {media.screenShareOn ? 'مشاركة الشاشة' : media.cameraOn ? 'الكاميرا' : 'في الانتظار'}
                  </span>
                  <span className="rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-xs font-black text-white/85 backdrop-blur" dir="ltr">
                    Room #{info.stream_id}
                  </span>
                </div>
              </div>

              {media.screenShareOn && media.cameraOn && (
                <div className="relative aspect-video w-full overflow-hidden rounded-[1.4rem] border border-white/10 bg-[#0b1220] shadow-xl shadow-black/35 ring-1 ring-white/10 lg:aspect-[4/5]">
                  <video ref={cameraVideoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
                  <div className="absolute bottom-3 end-3 rounded-full bg-black/55 px-3 py-1.5 text-xs font-black text-white backdrop-blur">
                    الكاميرا
                  </div>
                </div>
              )}
            </div>
          </main>

          {mediaError && (
            <div className="absolute inset-x-4 bottom-28 mx-auto max-w-2xl rounded-2xl border border-red-500/30 bg-red-950/70 px-4 py-3 text-center text-sm text-red-100 backdrop-blur">
              {mediaError}
            </div>
          )}

          {chatOpen && (
            <aside className="fixed bottom-24 end-4 z-30 flex h-[min(34rem,calc(100vh-9rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#0b1220]/95 shadow-2xl shadow-black/50 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                <button
                  type="button"
                  onClick={() => setChatOpen(false)}
                  className="rounded-xl p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white"
                  aria-label="إغلاق الشات"
                >
                  <X className="h-5 w-5" />
                </button>
                <div className="text-right">
                  <p className="text-sm font-black text-white">الدردشة</p>
                  <p className="mt-1 text-xs text-zinc-500">live_chat_message</p>
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
                {chatMessages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center text-zinc-500">
                    <MessageSquare className="h-9 w-9" />
                    <p className="mt-3 text-sm">لا توجد رسائل بعد.</p>
                    <p className="mt-1 text-xs leading-5">
                      الرسائل الحالية محلية حتى ربط Socket.io event.
                    </p>
                  </div>
                ) : (
                  chatMessages.map((message) => (
                    <div key={message.id} className="rounded-2xl bg-white/8 px-3 py-2 text-right">
                      <p className="text-sm leading-6 text-white">{message.message}</p>
                      <p className="mt-1 text-xs text-zinc-500">{message.createdAt}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-white/10 p-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={sendLocalChatMessage}
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white transition hover:bg-blue-700"
                    aria-label="إرسال"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                  <input
                    value={chatDraft}
                    onChange={(e) => setChatDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') sendLocalChatMessage();
                    }}
                    placeholder="اكتب رسالة..."
                    className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-right text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-blue-400/70 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
            </aside>
          )}

          <div className="fixed inset-x-0 bottom-4 z-30 px-3">
            <div className="mx-auto flex w-fit max-w-full flex-row-reverse flex-wrap items-center justify-center gap-2 rounded-[1.4rem] border border-white/10 bg-white/10 p-2 shadow-2xl shadow-black/40 backdrop-blur-xl">
              <button
                type="button"
                onClick={handleLeave}
                disabled={leaveBusy}
                className="inline-flex items-center gap-2 rounded-2xl bg-red-500 px-4 py-3 text-sm font-black text-white transition hover:bg-red-600"
              >
                {leaveBusy && <Loader2 className="h-4 w-4 animate-spin" />}
                مغادرة
              </button>
              <ToolbarButton
                icon={MessageSquare}
                label="الدردشة"
                active={chatOpen}
                onClick={() => setChatOpen((value) => !value)}
              />
              <ToolbarButton
                icon={MonitorUp}
                label={media.screenShareOn ? 'إيقاف الشاشة' : 'مشاركة الشاشة'}
                active={media.screenShareOn}
                disabled={!info.can_publish || mediaBusy}
                onClick={toggleScreenShare}
              />
              <ToolbarButton
                icon={Camera}
                label={media.cameraOn ? 'الكاميرا تعمل' : 'الكاميرا'}
                active={media.cameraOn}
                disabled={!info.can_publish || mediaBusy}
                danger={!media.cameraOn}
                onClick={() => applyCameraMedia({ ...media, cameraOn: !media.cameraOn })}
              />
              <ToolbarButton
                icon={Mic}
                label={media.micOn ? 'الميكروفون يعمل' : 'الميكروفون'}
                active={media.micOn}
                disabled={!info.can_publish || mediaBusy}
                danger={!media.micOn}
                onClick={() => applyCameraMedia({ ...media, micOn: !media.micOn })}
              />
              {!info.can_publish && (
                <ToolbarButton
                  icon={Hand}
                  label={speakRequested ? 'تم الطلب' : 'إظهار إشارة'}
                  active={speakRequested}
                  disabled={speakRequested}
                  onClick={() => setSpeakRequested(true)}
                />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function EmptyStage({ canPublish, title }: { canPublish: boolean; title: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white shadow-[0_0_28px_rgba(239,68,68,0.35)]">
        <VideoOff className="h-6 w-6" />
      </div>
      <p className="mt-4 text-lg font-black text-white">{title}</p>
      <p className="mt-2 max-w-md text-sm leading-6 text-zinc-400">
        {canPublish
          ? 'افتح الكاميرا أو مشاركة الشاشة وسيظهر البث هنا فورًا.'
          : 'انتظر المضيف لفتح الكاميرا أو مشاركة الشاشة.'}
      </p>
    </div>
  );
}

function ToolbarButton({
  icon: Icon,
  label,
  active = false,
  danger = false,
  disabled = false,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const className = active
    ? 'border-emerald-400/30 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30'
    : danger
      ? 'border-red-400/25 bg-red-500/15 text-red-100 hover:bg-red-500/25'
      : 'border-white/10 bg-white/8 text-white/90 hover:bg-white/15';

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-3.5 py-3 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {disabled ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
      {label}
    </button>
  );
}
