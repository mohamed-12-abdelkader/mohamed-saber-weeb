import { ShieldBan } from 'lucide-react';
import { SITE_BLOCKED_MESSAGE } from '@/lib/site-config';

export function SiteBlockedScreen() {
  return (
    <div
      className="flex min-h-full flex-1 flex-col items-center justify-center bg-gradient-to-b from-red-50 via-zinc-50 to-zinc-100 px-4 py-16 dark:from-red-950/40 dark:via-zinc-950 dark:to-zinc-900"
      dir="rtl"
    >
      <div className="w-full max-w-xl rounded-3xl border border-red-200/80 bg-white p-10 text-center shadow-xl shadow-red-500/10 dark:border-red-900/50 dark:bg-zinc-900">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400">
          <ShieldBan className="h-9 w-9" strokeWidth={2} />
        </div>
        <h1 className="text-xl font-black text-red-700 dark:text-red-400">الموقع مغلق</h1>
        <p className="mt-5 text-base font-semibold leading-relaxed text-zinc-800 dark:text-zinc-100">
          {SITE_BLOCKED_MESSAGE}
        </p>
      </div>
    </div>
  );
}
