'use client';

import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/context/ThemeContext';

// Separate component for client-side functionality
function NotFoundContent() {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: colors.background.primary }}
    >
      <h1 
        className="text-4xl font-bold mb-4"
        style={{ color: colors.text.primary }}
      >
        404 - Page Not Found
      </h1>
      <p 
        className="text-lg mb-8"
        style={{ color: colors.text.secondary }}
      >
        The page you're looking for doesn't exist.
      </p>
      <button
        onClick={() => router.push('/')}
        className="px-6 py-3 rounded-xl transition-all duration-200 transform hover:scale-105"
        style={{
          background: `linear-gradient(to right, ${colors.primary.from}, ${colors.primary.to})`,
          color: colors.text.primary,
        }}
      >
        Go Home
      </button>
    </div>
  );
}

// Root component with Suspense boundary
export default function NotFound() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    }>
      <NotFoundContent />
    </Suspense>
  );
} 