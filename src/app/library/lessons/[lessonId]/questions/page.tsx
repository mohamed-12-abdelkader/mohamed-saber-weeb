import { Suspense } from 'react';
import { LessonQuestionsView } from '@/components/library/lesson-questions-view';

export default function LessonQuestionsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-zinc-500">
          جاري التحميل…
        </div>
      }
    >
      <LessonQuestionsView />
    </Suspense>
  );
}
