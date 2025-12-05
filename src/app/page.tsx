"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { LoginForm } from '@/components/auth/login-form';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();

  useEffect(() => {
    if (user && !loading) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </main>
    );
  }

  // Only show the login form if there's no user and auth state is loaded
  if (!user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
        <LoginForm />
      </main>
    );
  }

  // This will be shown briefly during the redirect
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </main>
  );
}
