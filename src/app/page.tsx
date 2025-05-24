'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { colors } = useTheme();

  useEffect(() => {
    // If we have user info (either logged in or not), redirect immediately
    if (!loading) {
      router.replace(user ? '/dashboard' : '/login');
    }
  }, [user, loading, router]);

  // Show minimal loading state
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: colors.background.primary }}>
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary"></div>
    </div>
  );
}
