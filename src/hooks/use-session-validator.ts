"use client";

import { useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { useToast } from './use-toast';

const SEVEN_DAYS_IN_MS = 7 * 24 * 60 * 60 * 1000;

export function useSessionValidator() {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (loading) {
      return; // Wait until Firebase has checked auth state
    }

    const sessionTimestampStr = localStorage.getItem('session_timestamp');

    if (!user) {
      // If there's no user but there's a stale timestamp, clear it.
      if (sessionTimestampStr) {
        localStorage.removeItem('session_timestamp');
      }
      // Redirect to login if not on an auth page
      if (window.location.pathname !== '/' && window.location.pathname !== '/signup') {
        router.push('/');
      }
      return;
    }

    const checkSession = () => {
      const sessionTimestamp = sessionTimestampStr ? parseInt(sessionTimestampStr, 10) : null;
      
      if (sessionTimestamp && (Date.now() - sessionTimestamp > SEVEN_DAYS_IN_MS)) {
        toast({
          variant: 'destructive',
          title: 'Session Expired',
          description: 'You have been logged out due to inactivity. Please log in again.',
        });
        signOut(auth);
        localStorage.removeItem('session_timestamp');
        router.push('/');
      }
    };
    
    // Check session on initial load
    checkSession();

    // Reset timestamp on user activity
    const handleActivity = () => {
        if(document.visibilityState === 'visible') {
            localStorage.setItem('session_timestamp', Date.now().toString());
        }
    };

    window.addEventListener('visibilitychange', handleActivity);
    window.addEventListener('focus', handleActivity);

    return () => {
      window.removeEventListener('visibilitychange', handleActivity);
      window.removeEventListener('focus', handleActivity);
    };

  }, [user, loading, router, toast]);

  return { isLoading: loading };
}
