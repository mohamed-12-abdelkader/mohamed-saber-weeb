import { Suspense } from 'react';
import { LevelExamManagement } from '@/components/library/level-exam-management';

export default function LevelExamPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-zinc-500">
          جاري التحميل…
        </div>
      }
    >
      <LevelExamManagement />
    </Suspense>
  );
}
