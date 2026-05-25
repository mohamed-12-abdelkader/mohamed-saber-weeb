import type { Metadata } from 'next';
import { LibraryShell } from '@/components/library/library-shell';

export const metadata: Metadata = {
  title: 'مكتبة الأسئلة | بنك الأسئلة',
  description: 'إدارة الدورات والدروس والأسئلة',
};

export default function LibraryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LibraryShell>{children}</LibraryShell>;
}
