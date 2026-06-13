import { Suspense } from 'react';
import { GeneralExamManagement } from '@/components/library/general-exam-management';

export default function GeneralExamPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-zinc-500">
          جاري التحميل…
        </div>
      }
    >
      <GeneralExamManagement />
    </Suspense>
  );
}
