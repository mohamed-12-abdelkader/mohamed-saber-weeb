import type { Metadata } from 'next';
import { LibraryShell } from '@/components/library/library-shell';

export const metadata: Metadata = {
  title: 'إدارة الكورسات | بنك الأسئلة',
  description: 'إدارة كورسات المنصة ومكتبة الأسئلة',
};

export default function LibraryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LibraryShell>{children}</LibraryShell>;
}
