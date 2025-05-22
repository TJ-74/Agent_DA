'use client';

import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from '@/context/AuthContext';
import { FileProvider } from '@/context/FileContext';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <FileProvider>
          {children}
        </FileProvider>
      </ThemeProvider>
    </AuthProvider>
  );
} 