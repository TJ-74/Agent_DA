'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import Image from 'next/image';

export default function LoginPage() {
  const { user, signInWithGoogle, loading } = useAuth();
  const router = useRouter();
  const { colors } = useTheme();

  useEffect(() => {
    if (user && !loading) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <main 
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: colors.background.primary }}
    >
      {/* Background grid */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
      
      {/* Login container */}
      <div 
        className="relative z-10 w-full max-w-md p-8 rounded-2xl shadow-2xl backdrop-blur-xl"
        style={{ 
          background: colors.background.card,
          border: `1px solid ${colors.border.light}`,
        }}
      >
        <div className="text-center mb-8">
          <h1 
            className="text-3xl font-bold mb-2"
            style={{ color: colors.text.primary }}
          >
            Welcome to Data Analyst
          </h1>
          <p 
            className="text-sm opacity-70"
            style={{ color: colors.text.secondary }}
          >
            Sign in to start analyzing your data
          </p>
        </div>

        <button
          onClick={signInWithGoogle}
          className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2"
          style={{
            background: colors.background.input,
            border: `1px solid ${colors.border.light}`,
            color: colors.text.primary,
          }}
        >
          <Image
            src="/google-logo.svg"
            alt="Google Logo"
            width={20}
            height={20}
          />
          Continue with Google
        </button>

        <p 
          className="mt-6 text-center text-sm"
          style={{ color: colors.text.secondary }}
        >
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </main>
  );
} 