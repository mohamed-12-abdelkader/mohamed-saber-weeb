import { LoginForm } from '@/components/login-form';

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950">
      <LoginForm />
    </div>
  );
}
