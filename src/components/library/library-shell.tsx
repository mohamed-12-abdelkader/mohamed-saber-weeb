'use client';

import {
  BookOpen,
  ChevronRight,
  Gauge,
  KeyRound,
  LayoutDashboard,
  LibraryBig,
  LogOut,
  Menu,
  PanelLeftClose,
  Sparkles,
  Settings2,
  User,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { clearSession, getToken, getUser, isAdmin } from '@/lib/auth-storage';

const NAV = [
  {
    href: '/library',
    label: 'إدارة الكورسات',
    description: 'كورسات، مستويات، دروس وطلاب',
    icon: LayoutDashboard,
    accent: 'blue',
  },
  {
    href: '/library/activation-codes',
    label: 'أكواد التفعيل',
    description: 'إنشاء ومتابعة أكواد الاشتراك',
    icon: KeyRound,
    accent: 'orange',
  },
  {
    href: '/library/placement-test',
    label: 'تحديد المستوى',
    description: 'مستويات، اختبار، أسئلة ومحاولات',
    icon: Gauge,
    accent: 'violet',
  },
  {
    href: '/library/courses',
    label: 'مكتبة الأسئلة',
    description: 'كورسات وأسئلة بنك الأسئلة',
    icon: BookOpen,
    accent: 'emerald',
  },
  {
    href: '/library/settings',
    label: 'إعدادات مكتبة الأسئلة',
    description: 'تهيئة التصنيفات والإعدادات',
    icon: Settings2,
    accent: 'violet',
  },
] as const;

type NavItem = (typeof NAV)[number];

function isNavActive(pathname: string, href: NavItem['href']) {
  return href === '/library'
    ? pathname === '/library' ||
        pathname.startsWith('/library/admin-courses') ||
        pathname.startsWith('/library/live-streams') ||
        pathname.startsWith('/library/level-exams') ||
        pathname.startsWith('/library/general-exams')
    : href === '/library/courses'
      ? pathname.startsWith('/library/courses') || pathname.startsWith('/library/lessons')
      : pathname.startsWith(href);
}

function accentClassName(accent: NavItem['accent'], active: boolean) {
  const palette = {
    blue: active
      ? 'bg-blue-600 text-white shadow-blue-500/25'
      : 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-300',
    orange: active
      ? 'bg-orange-500 text-white shadow-orange-500/25'
      : 'bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-300',
    emerald: active
      ? 'bg-emerald-600 text-white shadow-emerald-500/25'
      : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300',
    violet: active
      ? 'bg-violet-600 text-white shadow-violet-500/25'
      : 'bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-300',
  } as const;

  return palette[accent];
}

function LibraryNavLinks({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-1 flex-col gap-2 p-3">
      {NAV.map(({ href, label, description, icon: Icon, accent }) => {
        const active = isNavActive(pathname, href);

        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={`group relative overflow-hidden rounded-2xl border p-3 text-right transition ${
              active
                ? 'border-blue-200 bg-white shadow-lg shadow-blue-500/10 dark:border-blue-900/60 dark:bg-zinc-900'
                : 'border-transparent text-zinc-600 hover:border-zinc-200 hover:bg-white hover:shadow-sm dark:text-zinc-400 dark:hover:border-zinc-800 dark:hover:bg-zinc-900'
            }`}
          >
            {active && (
              <span className="absolute inset-y-3 end-0 w-1 rounded-s-full bg-blue-600" />
            )}
            <span className="relative flex flex-row-reverse items-center gap-3">
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-sm ${accentClassName(
                  accent,
                  active
                )}`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={`block text-sm font-black ${
                    active ? 'text-zinc-950 dark:text-white' : 'text-zinc-800 dark:text-zinc-100'
                  }`}
                >
                  {label}
                </span>
                <span className="mt-1 block truncate text-xs text-zinc-500">{description}</span>
              </span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export function LibraryShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = getUser();
  const admin = isAdmin();
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleLogout() {
    clearSession();
    router.replace('/');
  }

  useEffect(() => {
    if (!getToken()) {
      router.replace('/');
    }
  }, [router]);

  if (!getToken()) {
    return null;
  }

  if (!admin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-zinc-100 to-zinc-200 px-4 dark:from-zinc-950 dark:to-zinc-900">
        <div className="max-w-md rounded-2xl border border-amber-200/80 bg-white p-10 text-center shadow-xl dark:border-amber-900/40 dark:bg-zinc-900">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
            <LibraryBig className="h-8 w-8" />
          </div>
          <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            لوحة الإدارة للمسؤولين فقط
          </p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            مسار{' '}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs dark:bg-zinc-800">
              /api/admin/courses
            </code>{' '}
            محمي بدور المسؤول.
          </p>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-6 py-3 text-sm font-medium text-white shadow-lg transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
          >
            <ChevronRight className="h-4 w-4 rotate-180" />
            العودة لتسجيل الدخول
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-zinc-100/90 dark:bg-zinc-950">
      {/* Desktop sidebar */}
      <aside className="relative hidden w-80 shrink-0 flex-col overflow-hidden border-e border-zinc-200/80 bg-zinc-50 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 md:flex">
        <div className="absolute -start-24 -top-24 h-56 w-56 rounded-full bg-blue-500/10 blur-2xl" />
        <div className="absolute -bottom-24 end-6 h-48 w-48 rounded-full bg-orange-500/10 blur-2xl" />

        <div className="relative m-3 overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-zinc-950 p-5 text-white shadow-xl shadow-blue-500/20">
          <div className="absolute -start-8 -top-10 h-28 w-28 rounded-full bg-white/10" />
          <div className="absolute -bottom-10 end-8 h-24 w-24 rounded-full bg-orange-400/20" />
          <div className="relative flex flex-row-reverse items-center gap-3 text-right">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/30 bg-white/15">
              <LibraryBig className="h-6 w-6" strokeWidth={2.25} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-black">لوحة الإدارة</p>
              <p className="mt-1 text-xs font-bold text-white/75">Question Bank Admin</p>
            </div>
          </div>
          <div className="relative mt-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-black">
            <Sparkles className="h-3.5 w-3.5 text-orange-300" />
            إدارة المحتوى والمنصة
          </div>
        </div>

        <div className="relative px-3 pb-2 pt-1 text-right">
          <p className="px-3 text-xs font-black uppercase tracking-wide text-zinc-400">
            روابط سريعة
          </p>
        </div>

        <div className="relative flex min-h-0 flex-1 flex-col">
          <LibraryNavLinks pathname={pathname} />
        </div>

        <div className="relative border-t border-zinc-200/70 p-4 dark:border-zinc-800">
          <div className="rounded-3xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
            <div className="flex flex-row-reverse items-center gap-3 text-right">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                <User className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-zinc-900 dark:text-zinc-100">
                  {user?.name}
                </p>
                <p className="truncate text-xs text-zinc-500">{user?.role}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm font-black text-red-600 transition hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300 dark:hover:bg-red-950/35"
            >
              <LogOut className="h-4 w-4" />
              خروج
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-zinc-200/80 bg-white/95 px-4 shadow-sm backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/95 md:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-white md:hidden dark:border-zinc-700 dark:bg-zinc-900"
              onClick={() => setMobileOpen(true)}
              aria-label="القائمة"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden items-center gap-2 text-sm text-zinc-500 md:flex">
              <PanelLeftClose className="h-4 w-4" />
              <span className="font-medium text-zinc-800 dark:text-zinc-200">
                لوحة الإدارة
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">خروج</span>
          </button>
        </header>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              aria-label="إغلاق"
              onClick={() => setMobileOpen(false)}
            />
            <div className="absolute end-0 top-0 flex h-full w-[min(100%,18rem)] flex-col border-s border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
              <div className="m-3 rounded-3xl bg-gradient-to-br from-blue-600 to-zinc-950 p-4 text-white">
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-xl p-2 text-white/80 transition hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                  <div className="flex flex-row-reverse items-center gap-3 text-right">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15">
                      <LibraryBig className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-black">لوحة الإدارة</p>
                      <p className="text-xs text-white/70">روابط المكتبة</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-4 pb-1 text-right">
                <span className="text-xs font-black text-zinc-400">القائمة</span>
              </div>
              <LibraryNavLinks pathname={pathname} onNavigate={() => setMobileOpen(false)} />
              <div className="mt-auto border-t border-zinc-100 p-4 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-black text-red-600 dark:bg-red-950/20 dark:text-red-300"
                >
                  <LogOut className="h-4 w-4" />
                  خروج
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
