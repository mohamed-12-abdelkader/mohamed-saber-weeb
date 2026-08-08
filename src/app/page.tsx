import { LoginForm } from '@/components/login-form';
import { SiteBlockedScreen } from '@/components/site-blocked-screen';
import { SITE_BLOCKED } from '@/lib/site-config';

export default function Home() {
  if (SITE_BLOCKED) {
    return <SiteBlockedScreen />;
  }

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950">
      <LoginForm />
    </div>
  );
}
