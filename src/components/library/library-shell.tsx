'use client';

import {
  BookOpen,
  ChevronRight,
  LayoutDashboard,
  LibraryBig,
  LogOut,
  Menu,
  PanelLeftClose,
  Settings2,
  User,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { clearSession, getToken, getUser, isAdmin } from '@/lib/auth-storage';

const NAV = [
  { href: '/library', label: 'لوحة التحكم', icon: LayoutDashboard },
  { href: '/library/courses', label: 'الدورات والدروس', icon: BookOpen },
  { href: '/library/settings', label: 'إعدادات الكورسات', icon: Settings2 },
] as const;

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
            مكتبة الأسئلة للمسؤولين فقط
          </p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            مسار{' '}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs dark:bg-zinc-800">
              /api/admin/question-library
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
      <aside className="relative hidden w-72 shrink-0 flex-col border-e border-zinc-200/80 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950 md:flex">
        <div className="flex h-16 items-center gap-3 border-b border-zinc-100 px-5 dark:border-zinc-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-md">
            <LibraryBig className="h-5 w-5" strokeWidth={2.25} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-zinc-900 dark:text-white">
              مكتبة الأسئلة
            </p>
            <p className="text-xs text-zinc-500">Question Library</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active =
              href === '/library'
                ? pathname === '/library'
                : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? 'bg-indigo-50 text-indigo-900 shadow-sm dark:bg-indigo-950/60 dark:text-indigo-100'
                    : 'text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0 opacity-80" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-zinc-100 p-4 dark:border-zinc-800">
          <div className="flex items-center gap-3 rounded-xl bg-zinc-50 px-3 py-2 dark:bg-zinc-900/80">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700">
              <User className="h-4 w-4 text-zinc-600 dark:text-zinc-300" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {user?.name}
              </p>
              <p className="truncate text-xs text-zinc-500">{user?.role}</p>
            </div>
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
              <div className="flex h-14 items-center justify-between border-b border-zinc-100 px-4 dark:border-zinc-800">
                <span className="font-semibold text-zinc-900 dark:text-white">
                  القائمة
                </span>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg p-2 text-zinc-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex flex-col gap-1 p-3">
                {NAV.map(({ href, label, icon: Icon }) => {
                  const active =
                    href === '/library'
                      ? pathname === '/library'
                      : pathname.startsWith(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium ${
                        active
                          ? 'bg-indigo-50 text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-100'
                          : 'text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      {label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        )}

        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
